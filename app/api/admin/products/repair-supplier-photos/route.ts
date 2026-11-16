import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { jsonStoreWriteConfigured, mutateJsonStore, readJsonStore, writeBinaryAsset, PRODUCTS_PATH } from "@/lib/json-store";
import type { ProductRecord } from "@/lib/commerce-types";
import { shopMediaBucket } from "@/lib/r2-media";
import sources from "@/data/verified-supplier-photo-pages.json";
import {
  officialPageUrl, officialImageUrl, supportsOfficialProductIdentity,
  extractProductPhoto, imageExtension, type OfficialSource,
} from "@/lib/verified-supplier-media";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const map=sources as Record<string,OfficialSource>;
const json=(data:unknown,status=200)=>NextResponse.json(data,{
  status,headers:{"Cache-Control":"private, no-store"},
});
async function getUrl(url:string,host:string) {
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.hostname!==host||parsed.username||parsed.password)
    throw new Error("Недозволений хост");
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const response=await fetch(parsed.href,{
      redirect:"manual",cache:"no-store",signal:ctrl.signal,
      headers:{"Accept":"text/html,image/webp,image/jpeg,image/png","User-Agent":"RESET Clinic supplier media QA"},
    });
    if(!response.ok)throw new Error("Джерело повернуло HTTP "+response.status);
    return response;
  }finally{clearTimeout(timer);}
}
async function getPhoto(source:OfficialSource){
  const page=officialPageUrl(source.page,source.brand);
  if(!page)throw new Error("Немає перевіреної адреси виробника");
  const response=await getUrl(page.href,page.hostname);
  if(!(response.headers.get("content-type")||"").includes("text/html"))
    throw new Error("Офіційне джерело не повернуло HTML");
  const html=await response.text();
  if(html.length>2_000_000)throw new Error("Сторінка перевищує ліміт");
  if(!supportsOfficialProductIdentity(html,source))
    throw new Error("Назва товару на сторінці виробника не підтверджена");
  const photoUrl=extractProductPhoto(html,source);
  if(!photoUrl)throw new Error("Немає підтвердженого product og:image");
  const photo=officialImageUrl(photoUrl,source);
  if(!photo)throw new Error("Зображення не належить дозволеному виробнику");
  const imageResponse=await getUrl(photo,new URL(photo).hostname);
  const declared=Number(imageResponse.headers.get("content-length")||0);
  if(declared>7_000_000)throw new Error("Файл фото завеликий");
  const bytes=new Uint8Array(await imageResponse.arrayBuffer());
  if(bytes.byteLength<1500||bytes.byteLength>7_000_000)throw new Error("Некоректний розмір фото");
  const mime=(imageResponse.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const extension=imageExtension(bytes,mime);
  if(!extension)throw new Error("Фото повернуто в неочікуваному форматі");
  return {bytes,extension,sourceUrl:photo};
}
export async function GET(){
  if(!(await isAdminAuthenticated()))return json({error:"Unauthorized"},401);
  const rows=(await readJsonStore<ProductRecord[]>(PRODUCTS_PATH,[])).data;
  const eligible=rows.filter(p=>map[p.slug]&&map[p.slug].brand===p.brand);
  return json({ok:true,total:eligible.length,missing:eligible.filter(p=>!p.image_url).length,
    rows:eligible.map(p=>({slug:p.slug,name:p.name,brand:p.brand,
      missing:!p.image_url,sourcePage:map[p.slug].page})),
    mediaWritable:Boolean(shopMediaBucket()&&jsonStoreWriteConfigured())});
}
export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return json({error:"Unauthorized"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin)
    return json({error:"Некоректне джерело запиту"},403);
  if(!jsonStoreWriteConfigured()||!shopMediaBucket())
    return json({error:"D1 або R2 недоступні"},503);
  try{
    const body=await request.json() as {slugs?:unknown};
    if(!Array.isArray(body.slugs)||body.slugs.length<1||body.slugs.length>4||
      body.slugs.some(s=>typeof s!=="string"||!Object.hasOwn(map,s))||
      new Set(body.slugs).size!==body.slugs.length)
      throw new Error("Оберіть 1–4 товари з перевіреними сторінками");
    const results:{slug:string;state:"attached"|"skipped"|"failed";reason?:string}[]=[];
    for(const slug of body.slugs as string[]){
      try{
        const before=(await readJsonStore<ProductRecord[]>(PRODUCTS_PATH,[])).data
          .find(p=>p.slug===slug);
        const source=map[slug];
        if(!before||before.brand!==source.brand||Boolean(before.image_url)){
          results.push({slug,state:"skipped",reason:"Фото вже є або товар відсутній"});continue;
        }
        const photo=await getPhoto(source);
        const path="products/official-recovery/"+slug+"-"+Date.now()+"."+photo.extension;
        const image=await writeBinaryAsset(path,photo.bytes.buffer as ArrayBuffer,"Verified supplier photo "+slug);
        let attached=false;
        await mutateJsonStore<ProductRecord[]>(PRODUCTS_PATH,[],
          "Verified official media for "+slug,rows=>rows.map(p=>{
            if(p.id!==before.id||p.slug!==slug||p.brand!==source.brand||p.image_url)return p;
            attached=true;
            return {...p,image_url:image,updated_at:new Date().toISOString()};
          }));
        // Assert the object was actually written to R2 instead of trusting URL.
        if(attached){
          const stored=await shopMediaBucket()!.get(path);
          if(!stored)throw new Error("URL збережено, але файл відсутній в R2 — перевірте сховище");
        }
        results.push({slug,state:attached?"attached":"skipped"});
      }catch(error){
        results.push({slug,state:"failed",reason:error instanceof Error?error.message:String(error)});
      }
    }
    return json({ok:true,results,attached:results.filter(x=>x.state==="attached").length,
      failed:results.filter(x=>x.state==="failed").length});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Помилка відновлення фото"},400);
  }
}
