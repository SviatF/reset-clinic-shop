import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ProductRecord } from "@/lib/commerce-types";
import sources from "@/data/histolab-official-photo-sources.json";
import { officialHistoImageUrl, extractOfficialHistolabImage, photoMimeFromBytes } from "@/lib/histolab-photo-repair";
import { jsonStoreWriteConfigured, mutateJsonStore, readJsonStore, writeBinaryAsset, PRODUCTS_PATH } from "@/lib/json-store";
import { shopMediaBucket } from "@/lib/r2-media";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Source={sourcePage:string;verifiedImageUrl?:string;verifiedBy:string;source:string};
const catalog=sources as Record<string,Source>;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{
  status,headers:{"Cache-Control":"private, no-store"},
});
async function officialFetch(url:string, timeout=18000) {
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||parsed.hostname!=="histolab.com.ua"||
    parsed.username||parsed.password) throw new Error("Дозволені лише офіційні сторінки Histolab");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetch(parsed.href,{
      method:"GET",redirect:"manual",cache:"no-store",
      headers:{"Accept":"text/html,image/webp,image/png,image/jpeg","User-Agent":"RESET Clinic verified catalog sync"},
      signal:controller.signal,
    });
    if(!response.ok) throw new Error("Офіційний сайт повернув HTTP "+response.status);
    return response;
  } finally { clearTimeout(timer); }
}
async function getOfficialImage(source:Source) {
  let originError="";
  let image=officialHistoImageUrl(source.verifiedImageUrl,source.sourcePage);
  // Prefer the full-resolution product-specific OG image when supplied.
  try {
    const page=await officialFetch(source.sourcePage);
    const contentType=(page.headers.get("content-type")||"").toLowerCase();
    if(!contentType.includes("text/html")) throw new Error("Не HTML сторінка");
    const html=await page.text();
    const official=extractOfficialHistolabImage(html,source.sourcePage);
    if(official) image=official;
  } catch (err) { originError=err instanceof Error?err.message:String(err); }
  if(!image) throw new Error("Не знайдено перевіреного фото в офіційній картці. "+originError);
  // The image URL has been allowlisted before performing this outbound request.
  const response=await officialFetch(image,19000);
  const declared=Number(response.headers.get("content-length")||0);
  if(declared>6_000_000) throw new Error("Фото завелике (>6 MB)");
  const mime=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength<1400||bytes.byteLength>6_000_000) throw new Error("Некоректний розмір фото");
  const extension=photoMimeFromBytes(bytes,mime);
  if(!extension) throw new Error("Некоректний тип або пошкоджене фото");
  return { bytes, extension, sourceUrl:image };
}
function officialHistolabKey(product:ProductRecord):string|null {
  const url=String(product.image_url||"");
  const prefix=url.startsWith("/shop-media/")?"/shop-media/":
    url.startsWith("/api/media/")?"/api/media/":null;
  if(!prefix)return null;
  const key=url.slice(prefix.length);
  const expected="products/histolab-official/"+product.slug;
  if(!key.startsWith(expected))return null;
  const suffix=key.slice(expected.length);
  return /^(?:-[0-9]+)?\.(?:webp|jpe?g|png)$/i.test(suffix)?key:null;
}
function isMissing(product:ProductRecord) {
  return product.brand==="Histolab" &&
    !String(product.image_url||"").trim() &&
    Object.hasOwn(catalog,product.slug);
}
async function hasMissingManagedPhoto(product:ProductRecord) {
  if(isMissing(product))return true;
  if(product.brand!=="Histolab"||!Object.hasOwn(catalog,product.slug))return false;
  const key=officialHistolabKey(product);
  if(!key)return false; // Respect images uploaded directly by the administrator.
  const bucket=shopMediaBucket();
  if(!bucket)throw new Error("Cloudflare R2 недоступне для перевірки");
  return !(await bucket.get(key));
}
export async function GET() {
  if(!(await isAdminAuthenticated())) return reply({error:"Unauthorized"},401);
  try {
    const products=(await readJsonStore<ProductRecord[]>(PRODUCTS_PATH,[])).data;
    const rows=await Promise.all(products.filter(p=>p.brand==="Histolab" && Object.hasOwn(catalog,p.slug))
      .map(async p=>{
        const missing=await hasMissingManagedPhoto(p);
        return {
          id:p.id,slug:p.slug,name:p.name,status:p.status,
          imageUrl:p.image_url||null,
          urlAttached:Boolean(p.image_url),
          r2Verified:Boolean(officialHistolabKey(p))&&!missing,
          missing,
          sourcePage:catalog[p.slug].sourcePage,
          hasVerifiedImageUrl:Boolean(catalog[p.slug].verifiedImageUrl),
        };
      }));
    return reply({ok:true,total:rows.length,
      urlAttached:rows.filter(p=>p.urlAttached).length,
      r2Verified:rows.filter(p=>p.r2Verified).length,
      missing:rows.filter(p=>p.missing).length,rows,
      r2:Boolean(shopMediaBucket())});
  } catch(error) {
    return reply({error:error instanceof Error?error.message:"Не вдалося отримати каталог"},500);
  }
}
export async function POST(request:Request) {
  if(!(await isAdminAuthenticated())) return reply({error:"Unauthorized"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin)
    return reply({error:"Недозволене джерело запиту"},403);
  if(!jsonStoreWriteConfigured()||!shopMediaBucket())
    return reply({error:"D1 або R2 не налаштовані"},503);
  try {
    const body=await request.json() as {slugs?:unknown};
    if(!Array.isArray(body.slugs)||!body.slugs.length||body.slugs.length>4 ||
        body.slugs.some(v=>typeof v!=="string" || !Object.hasOwn(catalog,v)) ||
        new Set(body.slugs).size!==body.slugs.length)
      throw new Error("Оберіть від 1 до 4 підтверджених товарів Histolab");
    const slugs=body.slugs as string[];
    const saved:{slug:string;status:"added"|"skipped"|"failed";reason?:string;photo?:string}[]=[];
    for(const slug of slugs) {
      try {
        const original=(await readJsonStore<ProductRecord[]>(PRODUCTS_PATH,[])).data
          .find(p=>p.slug===slug);
        if(!original||original.brand!=="Histolab")
          {saved.push({slug,status:"skipped",reason:"Не знайдено товар у D1"});continue;}
        if(!(await hasMissingManagedPhoto(original)))
          {saved.push({slug,status:"skipped",reason:"Фотографія вже існує в R2 або встановлена вручну"});continue;}
        const source=catalog[slug];
        const photo=await getOfficialImage(source);
        // Version the key to bypass previous failed/stale browser caches.
        const path="products/histolab-official/"+slug+"-"+Date.now()+"."+photo.extension;
        const url=await writeBinaryAsset(path,photo.bytes.buffer as ArrayBuffer,
          "Verified official Histolab product photo "+slug);
        let attached=false;
        await mutateJsonStore<ProductRecord[]>(PRODUCTS_PATH,[],
          "Admin: attach official Histolab photo "+slug,rows=>{
            return rows.map(row=>{
              if(row.slug!==slug || row.brand!=="Histolab" ||
                 row.image_url!==original.image_url) return row;
              // A concurrent manual image edit is never overwritten. The
              // original missing or broken managed image was verified above.
              attached=true;
              return { ...row, image_url:url, updated_at:new Date().toISOString() };
            });
          });
        saved.push({slug,status:attached?"added":"skipped",
          ...(attached?{photo:url}:{reason:"Товар уже мав фото на момент запису"})});
      } catch(error) {
        saved.push({slug,status:"failed",reason:error instanceof Error?error.message:String(error)});
      }
    }
    return reply({ok:true,results:saved,added:saved.filter(r=>r.status==="added").length,
      failed:saved.filter(r=>r.status==="failed").length});
  } catch(error) {
    return reply({error:error instanceof Error?error.message:"Помилка фото"},400);
  }
}
