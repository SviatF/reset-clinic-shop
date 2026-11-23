import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentMethod = "card" | "cash_pickup";
type Name = "InitiateCheckout" | "AddPaymentInfo" | "Purchase";
const STEPS: readonly Name[] = ["InitiateCheckout", "AddPaymentInfo", "Purchase"];
const respond = (payload: unknown, status=200) => NextResponse.json(payload, {
  status, headers: { "Cache-Control": "no-store, private" }
});

function config() {
  const pixelId = (process.env.META_PIXEL_ID || "").trim();
  const token = (process.env.META_CAPI_ACCESS_TOKEN || "").trim();
  const fallbackCode = (process.env.META_TEST_EVENT_CODE || "").trim();
  return {
    pixelId: /^\d{6,30}$/.test(pixelId) ? pixelId : "",
    token,
    fallbackCode: validTestCode(fallbackCode) ? fallbackCode : ""
  };
}
function validTestCode(value: string) {
  return /^TEST[A-Za-z0-9_-]{3,40}$/i.test(value);
}
function configInfo(){
  const c = config();
  return {
    pixelConfigured: Boolean(c.pixelId),
    tokenConfigured: Boolean(c.token),
    testCodeConfigured: Boolean(c.fallbackCode),
    mode: c.pixelId && c.token && c.fallbackCode ? "ready" : "setup_required",
    events: STEPS
  };
}

export async function GET(){
  return respond(configInfo());
}


type RateDb = {
  prepare(sql:string):{
    run():Promise<{meta?:{changes?:number}}>;
    bind(...values:unknown[]):{
      run():Promise<{meta?:{changes?:number}}>;
    };
  };
};
const RATE_TABLE = "shop_public_payment_test_limits";
const HOURLY_LIMIT = 3;
const DAILY_GLOBAL_LIMIT = 60;

/** D1-backed, atomic limits; fail closed if the database or identity is unavailable. */
async function publicTestRateLimit(request:NextRequest,token:string){
  const ip=request.headers.get("cf-connecting-ip");
  if (!ip || ip.length>64 || !/^[a-fA-F0-9:.]+$/.test(ip)) {
    return {allowed:false,reason:"Не вдалося перевірити ліміт тестів. Спробуйте пізніше.",status:503};
  }
  let db:RateDb | undefined;
  try {
    db=(getCloudflareContext().env as unknown as {SHOP_DB?:RateDb}).SHOP_DB;
    if (!db) throw new Error("D1 unavailable");
    await db.prepare(
      "CREATE TABLE IF NOT EXISTS "+RATE_TABLE+" ("+
      "bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL)"
    ).run();

    const now=Math.floor(Date.now()/1000);
    const hashedIp=createHash("sha256").update(token+":"+ip).digest("hex");
    const perIp="ip:"+hashedIp+":"+Math.floor(now/3600);
    const global="all:"+Math.floor(now/86400);
    const check=async (bucket:string, limit:number, expiration:number)=>{
      const result=await db!.prepare(
        "INSERT INTO "+RATE_TABLE+" (bucket,attempts,expires_at) VALUES (?,1,?) "+
        "ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 "+
        "WHERE attempts < ?"
      ).bind(bucket,expiration,limit).run();
      return (result.meta?.changes||0)===1;
    };
    // Global cap protects the Meta API credential even if clients rotate IPs.
    if (!await check(global,DAILY_GLOBAL_LIMIT,(Math.floor(now/86400)+1)*86400))
      return {allowed:false,reason:"Денний ліміт тестових подій вичерпано.",status:429};
    if (!await check(perIp,HOURLY_LIMIT,(Math.floor(now/3600)+1)*3600))
      return {allowed:false,reason:"Максимум 3 тестові запуски на годину з одного підключення.",status:429};
    return {allowed:true,reason:"",status:200};
  }catch{
    return {allowed:false,reason:"Перевірка ліміту тимчасово недоступна. Події не надсилалися.",status:503};
  }
}

type TestRequest = {
  amount?: number;
  method?: PaymentMethod;
};

export async function POST(request:NextRequest){
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return respond({error:"Запит має надходити з тестової сторінки цього сайту."},403);
  }
  if (Number(request.headers.get("content-length")||0) > 4096){
    return respond({error:"Завеликий запит."},413);
  }

  let body: TestRequest;
  try{
    body = await request.json() as TestRequest;
  }catch{
    return respond({error:"Некоректні дані тесту."},400);
  }
  const amount = Number(body.amount);
  const method = body.method;
  if (!Number.isFinite(amount) || amount < 1 || amount > 50000 ||
      Math.abs(amount*100 - Math.round(amount*100)) > .00001 ||
      !["card","cash_pickup"].includes(String(method))) {
    return respond({error:"Вкажіть тестову суму від 1 до 50 000 грн і спосіб оплати."},400);
  }

  const c = config();
  const testCode = c.fallbackCode;
  const runId = randomUUID();
  const names = Array.from(STEPS);

  // Strictly no Graph API call without both server-only credentials AND
  // a test-event code: never send a simulated Purchase to a live dataset.
  if (!c.pixelId || !c.token || !testCode) {
    const missing=[
      ...(!c.pixelId ? ["META_PIXEL_ID"] : []),
      ...(!c.token ? ["META_CAPI_ACCESS_TOKEN"] : []),
      ...(!testCode ? ["META_TEST_EVENT_CODE"] : [])
    ];
    return respond({
      ok:false,mode:"simulation",runId,missing,
      message:"Локальна симуляція. Події не надсилалися в Meta, оплату не створено.",
      events:names.map(name=>({name,status:"simulated",eventId:null}))
    });
  }

  const limit = await publicTestRateLimit(request,c.token);
  if (!limit.allowed) return respond({error:limit.reason},limit.status);

  const ua = (request.headers.get("user-agent") || "RESETClinicTest/1.0").slice(0,500);
  const eventSource = new URL("/admin/payment-test",
    process.env.SITE_URL?.startsWith("https://")
      ? process.env.SITE_URL : "https://shop.resetclinic.org").href;
  const identity = createHash("sha256").update("reset-clinic-test-"+runId).digest("hex");

  const results: Array<{
    name:Name;status:"sent"|"failed";eventId:string;eventsReceived:number;reason?:string;
  }> = [];

  for (const name of names) {
    const eventId = "rc-test-"+runId+"-"+name;
    const event = {
      event_name:name,
      event_time:Math.floor(Date.now()/1000),
      event_id:eventId,
      action_source:"website",
      event_source_url:eventSource,
      user_data:{
        client_user_agent:ua,
        external_id:identity
      },
      custom_data:{
        currency:"UAH",
        value:amount,
        content_type:"product",
        content_ids:["RESET-TEST-CHECKOUT"],
        contents:[{id:"RESET-TEST-CHECKOUT",quantity:1,item_price:amount}],
        num_items:1,
        order_id:"TEST-"+runId,
        payment_method:method,
        test_order:true
      }
    };
    try {
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      let response:Response;
      try{
        response=await fetch("https://graph.facebook.com/v25.0/"+c.pixelId+"/events",{
          method:"POST",
          headers:{
            "Authorization":"Bearer "+c.token,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({data:[event],test_event_code:testCode}),
          cache:"no-store",
          signal:controller.signal
        });
      }finally{clearTimeout(timeout);}
      // Never expose Meta's raw response (which may contain identifiers).
      const raw=await response.json().catch(()=>null) as
        | {events_received?:number;error?:{code?:number}} | null;
      const count=Number(raw?.events_received||0);
      results.push({
        name,status:response.ok&&count>0?"sent":"failed",
        eventId,eventsReceived:count,
        ...(!response.ok||count<1?{reason:"Meta API: HTTP "+response.status+
          (raw?.error?.code?" / code "+raw.error.code:"")}:{})
      });
    }catch(error){
      results.push({
        name,status:"failed",eventId,eventsReceived:0,
        reason:error instanceof Error && error.name==="AbortError"
          ?"Meta API: час очікування вичерпано"
          :"Не вдалося зв'язатися з Meta API"
      });
    }
  }

  const sent=results.filter(x=>x.status==="sent").length;
  return respond({
    ok:sent===names.length,
    mode:"meta_test",runId,
    message:sent===names.length
      ?"Meta прийняла всі тестові події. Перевірте вкладку Test Events."
      :"Частина тестових подій не пройшла. Перевірте статуси.",
    events:results
  },sent===names.length?200:207);
}
