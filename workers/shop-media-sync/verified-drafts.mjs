import verifiedPages from "../../data/verified-supplier-photo-pages.json" with { type: "json" };
import officialCU from "../../data/cu-skin-official-snapshot.json" with { type: "json" };
import { imageDimensions } from "./image-dimensions.mjs";

/**
 * Only exact product-specific URLs curated in the repository. Never guess
 * a photo from general product search or replace an unrelated item's image.
 */
const VERSION="verified-supplier-draft-2026-11-18-v4";
const LIMIT_PER_CRON=8;
const HOSTS={
  "HydroPeptide":new Set(["hydropeptide.ua","hydropeptide.com","www.hydropeptide.com","cdn.shopify.com"]),
  "Sensilis":new Set(["sensilis.com.ua","www.sensilis.com.ua","sensilis.com","www.sensilis.com","karvatska.store"]),
  "Cetaphil":new Set(["avepharm.com.ua"]),
  "CU SKIN":new Set(["key.cu.ua"]),
  "DÉCAAR":new Set(["decaar.com.ua","www.decaar.com.ua"]),
};
const PRODUCT_HOSTS={
  "HydroPeptide":new Set(["hydropeptide.ua","hydropeptide.com","www.hydropeptide.com"]),
  "Sensilis":new Set(["sensilis.com.ua","www.sensilis.com.ua","sensilis.com","www.sensilis.com","karvatska.store"]),
  "Cetaphil":new Set(["avepharm.com.ua"]),
  "CU SKIN":new Set(["cu.ua"]),
  "DÉCAAR":new Set(["decaar.com.ua","www.decaar.com.ua"]),
};
const entries=Object.entries(verifiedPages);
const MAX_SOURCE_BYTES=7_000_000;

const normalize=(text)=>String(text||"").normalize("NFKC").toLowerCase()
  .replace(/&amp;/g,"&").replace(/&#0*38;/g,"&")
  .replace(/spf\s*(\d+)/g,"spf$1")
  .replace(/(\d+),(\d+)/g,"$1.$2")
  .replace(/[^a-z0-9а-яіїєґ%+]+/giu," ").replace(/\s+/g," ").trim();
const numeric=(text)=>({
  spf:(normalize(text).match(/\bspf(\d{1,3})\b/)||[])[1]||null,
  strength:[...normalize(text).matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(x=>x[1]).sort().join(","),
  shade:(normalize(text).match(/(?:\b(?:shade|тон|no|n)\s*|№|#)(\d{1,3})\b/)||[])[1]||null,
});
function variantIsCompatible(a,b) {
  const left=numeric(a),right=numeric(b);
  for(const key of ["spf","strength","shade"])if(left[key]&&right[key]&&left[key]!==right[key])return false;
  return true;
}
function mainTitle(html) {
  const htmlTitle=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"";
  return htmlTitle.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function attr(markup,name) {
  const p=new RegExp("\\b"+name+"\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)')","i");
  const match=markup.match(p);
  return (match?.[1]||match?.[2]||"").replace(/&amp;/g,"&");
}
function meta(html,property) {
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    if(attr(tag,"property")===property||attr(tag,"name")===property)return attr(tag,"content");
  }
  return null;
}
function verifiedUrl(raw,brand,image=false,base="https://example.invalid/") {
  try{
    const url=new URL(raw,base);
    if(url.protocol==="http:" && brand==="HydroPeptide" && image &&
       ["hydropeptide.com","www.hydropeptide.com","cdn.shopify.com"].includes(url.hostname))
      url.protocol="https:";
    const allowed=image?HOSTS[brand]:PRODUCT_HOSTS[brand];
    if(!allowed?.has(url.hostname)||url.protocol!=="https:"||url.port||
        url.username||url.password||url.hash) return null;
    if(image && !/\.(?:png|jpe?g|webp)$/i.test(decodeURI(url.pathname)))return null;
    return url.href;
  }catch{return null;}
}
async function get(url,brand,image=false) {
  let current=verifiedUrl(url,brand,image);
  if(!current)throw Error("Unsafe supplier source URL");
  for(let hop=0;hop<3;hop++) {
    const response=await fetch(current,{redirect:"manual",headers:{
      Accept:image?"image/png,image/webp,image/jpeg":"text/html",
      "User-Agent":"RESET Shop verified supplier photo sync/1.0"
    },signal:AbortSignal.timeout(12000)});
    if([301,302,303,307,308].includes(response.status)){
      const target=response.headers.get("location");
      const next=target?verifiedUrl(target,brand,image,current):null;
      if(!next)throw Error("Unsafe supplier redirect");
      current=next;continue;
    }
    if(!response.ok)throw Error("Supplier HTTP "+response.status);
    return response;
  }
  throw Error("Too many redirects");
}
function mainGallery(html,brand){
  if(brand==="Sensilis"){
    const tag=(html.match(/<img\b[^>]*\bid\s*=\s*["']zoom["'][^>]*>/i)||[])[0]||
      (html.match(/<img\b[^>]*>/gi)||[]).find(x=>attr(x,"id")==="zoom");
    return (tag&&(attr(tag,"data-zoom-image")||attr(tag,"src"))) ||
      meta(html,"og:image")||meta(html,"og:image:secure_url");
  }
  return meta(html,"og:image")||meta(html,"og:image:secure_url");
}
function bytesExt(bytes,mime){
  if(mime==="image/png"&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return "png";
  if(mime==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "jpg";
  if(mime==="image/webp"&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&
      String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "webp";
  throw Error("Unsupported image MIME or magic bytes");
}
async function fetchVerifiedSource(known,product){
  if(!variantIsCompatible(known.title,product.name))
    throw Error("Mapped title variant differs from catalog");
  if(!normalize(product.name).includes(normalize(known.title)))
    throw Error("Source product name is not in the matching catalog title");
  let imageUrl=null;
  if(known.brand==="CU SKIN" && known.snapshotSku){
    // cu.ua product pages render the catalog in a JS app without an H1.
    // Its audited first-party catalog snapshot binds exact official SKU,
    // volume and source image, avoiding guesses against catalog search.
    const sku=officialCU.products.find(row=>row.sku===known.snapshotSku);
    if(!sku || sku.sourceUrl!==known.page || sku.mainImage!==known.photo ||
       !normalize(sku.name).includes(normalize(known.title)))
      throw Error("Official CU SKU or source photo does not match audited feed");
    if(product.size && !sku.volumes?.includes(product.size))
      throw Error("Official CU SKU has a different package size");
    imageUrl=verifiedUrl(sku.mainImage,known.brand,true);
    if(!imageUrl)throw Error("Official CU media URL denied");
  }else {
    if(known.snapshotSku)throw Error("Unsupported supplier snapshot override");
    const res=await get(known.page,known.brand);
    if(!(res.headers.get("content-type")||"").includes("text/html"))
      throw Error("Supplier page is not HTML");
    if(Number(res.headers.get("content-length")||0)>1_800_000)
      throw Error("Supplier product page too large");
    const html=await res.text();
    if(html.length>1_800_000)throw Error("Supplier product page too large");
    const pageTitle=mainTitle(html);
    if(!pageTitle||pageTitle.length<3)throw Error("Supplier product H1 missing");
    if(!variantIsCompatible(known.title,pageTitle) ||
       !variantIsCompatible(product.name,pageTitle))
      throw Error("Supplier live page has a different variant");
    if(known.sourceType==="merchant-exact-product" &&
       !normalize(pageTitle).includes(normalize(known.title)))
      throw Error("Exact merchant product H1 does not match requested SKU");
    if(known.brand!=="DÉCAAR" && known.brand!=="Cetaphil" &&
        !String(known.sourceType||"").startsWith("merchant-")){
      const expected=normalize(known.title).replace(/\s+/g," ");
      const actual=normalize(pageTitle);
      const key=expected.split(" ").filter(x=>x.length>3);
      const intersection=key.filter(x=>actual.includes(x)).length;
      if(key.length>0 && intersection<Math.max(1,Math.ceil(key.length*.5)))
        throw Error("Supplier live page title does not match mapped model");
    }
    // For an exact product source, allow selecting the original gallery file
    // instead of a resized/incorrect OG thumbnail, but require that exact
    // asset URL to be present in this product page's returned HTML.
    const raw=known.photo||mainGallery(html,known.brand);
    if(known.photo && !html.includes(known.photo) &&
       !html.includes(known.photo.replace(/&/g,"&amp;"))){
      // The supplier exposes only a 292px derivative in its product page,
      // while the 500ml original is available at the very same media ID.
      // Never permit arbitrary cross-product substitutions.
      const source=new URL(known.photo);
      const original=known.brand==="Cetaphil" && source.hostname==="avepharm.com.ua"
        ? source.pathname.match(/^\/storage\/(\d+)\/([a-zA-Z0-9_-]+)\.jpg$/):null;
      if(!original || !html.includes("/storage/"+original[1]+"/conversions/"+original[2]+"-"))
        throw Error("The reviewed photo is not tied to the exact supplier gallery");
    }
    imageUrl=raw?verifiedUrl(raw,known.brand,true,known.page):null;
    if(!imageUrl)throw Error("No verified original product image");
  }
  const imageRes=await get(imageUrl,known.brand,true);
  const size=Number(imageRes.headers.get("content-length")||0);
  if(size>MAX_SOURCE_BYTES)throw Error("Supplier image too large");
  const buffer=new Uint8Array(await imageRes.arrayBuffer());
  if(buffer.length<2500||buffer.length>MAX_SOURCE_BYTES)
    throw Error("Supplier image byte size invalid");
  const mime=(imageRes.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const ext=bytesExt(buffer,mime);
  const dimensions=imageDimensions(buffer);
  if(!dimensions||Math.min(dimensions.width,dimensions.height)<400 ||
       Math.max(dimensions.width,dimensions.height)>7500)
    throw Error("Supplier image intrinsic dimensions are inadequate");
  return {buffer,ext,mime,dimensions,imageUrl};
}
async function putR2(env,slug,photo,known) {
  const hashed=await crypto.subtle.digest("SHA-256",photo.buffer);
  const hash=[...new Uint8Array(hashed).slice(0,10)].map(b=>b.toString(16).padStart(2,"0")).join("");
  const key="products/verified-drafts/"+slug+"-"+hash+"."+photo.ext;
  if(!await env.SHOP_MEDIA.head(key)){
    await env.SHOP_MEDIA.put(key,photo.buffer,{httpMetadata:{contentType:photo.mime},
      customMetadata:{supplierBrand:known.brand,sourcePage:known.page}});
  }
  if(!await env.SHOP_MEDIA.head(key))throw Error("Cloudflare R2 photo write not found");
  return "/shop-media/"+key;
}
function eligible(products,slug,known) {
  const matched=products.filter(p=>p.slug===slug);
  if(matched.length!==1)return null;
  const p=matched[0];
  if(p.status!=="draft"||p.brand!==known.brand||p.image_url ||
     !(Number(p.price)>=0)||!Number.isFinite(Number(p.price)))return null;
  return p;
}
async function attachPhotoAndPublish(env,slug,known,url){
  for(let retries=0;retries<9;retries++){
    const source=await env.SHOP_DB.prepare(
      "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'").first();
    if(!source)throw Error("D1 products document missing");
    const rows=JSON.parse(source.content);
    if(!Array.isArray(rows)||rows.length<300)throw Error("Unexpected product catalog size");
    const p=eligible(rows,slug,known);
    if(!p){
      const existing=rows.find(row=>row.slug===slug);
      return {status:"skipped",reason:existing?.status==="active"?"Already published":"Product changed or variant unresolved"};
    }
    const now=new Date().toISOString();
    const next=rows.map(row=>row.id===p.id?{...row,image_url:url,status:"active",
      published_at:row.published_at||now,updated_at:now}:row);
    const changed=await env.SHOP_DB.prepare(
      "UPDATE shop_documents SET content=?,version=version+1,updated_at=datetime('now') WHERE pathname='data/products.json' AND version=?"
    ).bind(JSON.stringify(next),Number(source.version)).run();
    if((changed.meta?.changes||0)>0)return {status:"published",reason:"Exact verified source gallery image"};
  }
  throw Error("Concurrent D1 photo updates blocked publication");
}
export async function publishVerifiedSupplierDrafts(env,{limit=LIMIT_PER_CRON,manifest=verifiedPages,now=Math.floor(Date.now()/1000)}={}){
  await env.SHOP_DB.prepare("CREATE TABLE IF NOT EXISTS shop_verified_draft_media("+
    "slug TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT,checked_at INTEGER NOT NULL)").run();
  const entries=Object.entries(manifest);
  // Prioritize only drafts that CURRENTLY need photos. The previous version
  // exhausted its per-run quota on 38 already-active/skipped records and
  // starved the 12 Sensilis + 2 HydroPeptide photo gaps.
  const current=await env.SHOP_DB.prepare(
    "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'").first();
  if(!current)throw Error("D1 products document missing");
  const products=JSON.parse(current.content);
  const actionable=entries.filter(([slug,known])=>eligible(products,slug,known));
  const recent=await env.SHOP_DB.prepare(
    "SELECT slug,status,detail,checked_at FROM shop_verified_draft_media").all();
  const attempts=new Map((recent.results||[]).map(p=>[p.slug,p]));
  const pending=actionable.filter(([slug])=>{
    const previous=attempts.get(slug);
    if(!previous||!String(previous.detail||"").startsWith(VERSION+" | "))return true;
    // The D1 document is authoritative. An old skip may become actionable
    // after a separate supplier import, so skips must not be permanent.
    if(previous.status==="published")return false;
    return Number(previous.checked_at)<now-1800;
  }).slice(0,Math.max(0,Math.min(12,limit)));
  let result={planned:entries.length,actionable:actionable.length,attempted:0,published:0,skipped:0,error:0};
  for(const [slug,known] of pending){
    result.attempted++;
    let status="skipped",detail="Not a missing verified draft";
    try{
      const row=eligible(products,slug,known);
      if(row){
        const photo=await fetchVerifiedSource(known,row);
        const url=await putR2(env,slug,photo,known);
        const write=await attachPhotoAndPublish(env,slug,known,url);
        status=write.status;detail=write.reason;
      }
    }catch(error){
      status="error";detail=error instanceof Error?error.message:String(error);
    }
    result[status]++;
    await env.SHOP_DB.prepare(
      "INSERT INTO shop_verified_draft_media(slug,status,detail,checked_at) VALUES(?,?,?,unixepoch()) "+
      "ON CONFLICT(slug) DO UPDATE SET status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at"
    ).bind(slug,status,(VERSION+" | "+detail).slice(0,240)).run();
    console.log("Verified supplier draft photo",JSON.stringify({slug,status,detail}));
  }
  console.log("Verified supplier catalog draft publishing",JSON.stringify(result));
  return result;
}
export { verifiedUrl, mainGallery, variantIsCompatible, eligible, VERSION as VERIFIED_DRAFT_SYNC_VERSION };
