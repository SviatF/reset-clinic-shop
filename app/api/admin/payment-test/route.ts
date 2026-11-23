import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

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
  if (!(await isAdminAuthenticated())) return respond({error: "Доступ лише для адміністратора."},401);
  return respond(configInfo());
}

type TestRequest = {
  amount?: number;
  method?: PaymentMethod;
  testEventCode?: string;
};

export async function POST(request:NextRequest){
  if (!(await isAdminAuthenticated())) return respond({error: "Доступ лише для адміністратора."},401);

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return respond({error:"Запит має надходити з адмінпанелі цього сайту."},403);
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
  const override = typeof body.testEventCode === "string" ? body.testEventCode.trim() : "";
  if (override && !validTestCode(override)) {
    return respond({error:"Код тестових подій має починатися з TEST."},400);
  }
  const testCode = override || c.fallbackCode;
  const runId = randomUUID();
  const names = Array.from(STEPS);

  // Strictly no Graph API call without both server-only credentials AND
  // a test-event code: never send a simulated Purchase to a live dataset.
  if (!c.pixelId || !c.token || !testCode) {
    const missing=[
      ...(!c.pixelId ? ["META_PIXEL_ID"] : []),
      ...(!c.token ? ["META_CAPI_ACCESS_TOKEN"] : []),
      ...(!testCode ? ["META_TEST_EVENT_CODE або код з Meta Events Manager"] : [])
    ];
    return respond({
      ok:false,mode:"simulation",runId,missing,
      message:"Локальна симуляція. Події не надсилалися в Meta, оплату не створено.",
      events:names.map(name=>({name,status:"simulated",eventId:null}))
    });
  }

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
