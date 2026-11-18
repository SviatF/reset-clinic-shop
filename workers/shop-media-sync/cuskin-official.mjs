import snapshot from "../../data/cu-skin-official-snapshot.json" with { type: "json" };
import priceSource from "../../data/cu-skin-retail-prices-2026-11-12.json" with { type: "json" };
import { imageDimensions } from "./image-dimensions.mjs";

// Single, reviewed 112-item snapshot. Bump the revision when replacing this source.
const REVISION = "cu-official-2026-11-17-v1";
const PREFIX = "/shop-media/products/cu-skin-official/";
const STATUSES_DONE = new Set(["attached", "created", "already", "kept"]);
const SAFE_IMAGE_HOST = "key.cu.ua";
const skipWords = /^(?:cu|cuskin|skin)$/;

function normalize(text) {
  return String(text || "").normalize("NFKC").toLowerCase()
    .replace(/cu\s*:\s*/gu, " ").replace(/\bcuskin\b|\bcu\s*skin\b/gu, " ")
    .replace(/(\d+),(\d+)/g, "$1.$2")
    .replace(/[^a-z0-9а-яіїєґ.%+]+/giu, " ").replace(/\s+/g, " ").trim();
}
function titleKey(text) {
  const part=String(text||"").split("|").at(-1);
  return normalize(part).split(" ").filter(x=>x && !skipWords.test(x)).join(" ");
}
function sizes(value) {
  const result=[];
  const text=normalize(value).replace(/мл/g,"ml").replace(/гр|г/g,"g");
  for(const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(ml|g|шт|pcs)(?![a-zа-яіїєґ])/g)) {
    result.push(Number(match[1])+":"+match[2]);
  }
  return [...new Set(result)].sort().join(",");
}
function variantIncompatible(product, official) {
  const a=sizes(product.size), b=sizes(official.volumes.join(" "));
  if(a && b && !b.split(",").includes(a))return true;
  const get=(text,re)=>(String(text||"").match(re)||[])
    .map(x=>x.toLowerCase().replace(",",".").replace(/[^0-9.]/g,"")).sort().join(",");
  const current=String(product.name||"").split("|").at(-1);
  const source=official.name;
  const check=[
    /\d+(?:[.,]\d+)?\s*%/g,
    /spf\s*\d+/gi,
    /\b(?:no\.?|№|#)\s*\d{1,3}\b/gi,
  ];
  return check.some(re=>{const x=get(current,re),y=get(source,re);return x&&y&&x!==y;});
}
function officialNameMatch(product, official) {
  if(product.brand!=="CU SKIN" || variantIncompatible(product,official))return false;
  const a=titleKey(product.name),b=titleKey(official.name);
  return a.length>9 && a===b && sizes(product.size) &&
    (!sizes(official.volumes.join(" ")) ||
      sizes(official.volumes.join(" ")).split(",").includes(sizes(product.size)));
}
export function planOfficialProduct(rows,official){
  if(official.sku!=="300"+official.vendorCode || !/^300\d{3}$/.test(official.sku))
    return {kind:"conflict",reason:"Invalid supplier SKU",existing:null};
  const exact=rows.filter(row=>row.brand==="CU SKIN"&&String(row.sku||"")===official.sku);
  if(exact.length>1)return {kind:"conflict",reason:"Duplicate real SKU in D1",existing:null};
  if(exact.length===1){
    if(variantIncompatible(exact[0],official))return {kind:"conflict",reason:"Different volume, shade, strength or SPF",existing:null};
    return {kind:"update",existing:exact[0]};
  }
  const legacy=rows.filter(row=>officialNameMatch(row,official));
  if(legacy.length>1)return {kind:"conflict",reason:"Multiple legacy title matches",existing:null};
  if(legacy.length===1){
    if(legacy[0].sku && /^300\d{3}$/.test(String(legacy[0].sku)))
      return {kind:"conflict",reason:"Different real SKU already assigned",existing:null};
    return {kind:"update",existing:legacy[0],linkLegacy:true};
  }
  return {kind:"create",existing:null};
}
function category(official){
  const cats=official.categoryNames.map(x=>x.toLowerCase()).join(" ");
  const name=normalize(official.name);
  if(/волос|шампун|scalp/.test(cats+" "+name))
    return {category:"hair",sub:["shampoo"]};
  if(/тіла|body|intim|інтим|рук|hand|lip|губ/.test(cats+" "+name))
    return {category:"body",sub:[]};
  if(/сонц|spf|sun/.test(cats+" "+name))return {category:"face",sub:["spf"]};
  if(/очищ|ексфоліац/.test(cats))return {category:"face",sub:["cleansing"]};
  if(/тоніз/.test(cats))return {category:"face",sub:["toning"]};
  if(/сироват/.test(cats))return {category:"face",sub:["serums"]};
  if(/крем/.test(cats))return {category:"face",sub:["cream"]};
  return {category:"face",sub:[]};
}
function makeDraft(official, url, now, position, prices){
  const g=category(official),amount=Number(prices[official.sku]);
  const price=Number.isFinite(amount)&&amount>0?amount:0;
  return {
    id:"cu-official-"+official.vendorCode,slug:"cu-skin-official-"+official.vendorCode,
    name:"CU SKIN "+official.name,brand:"CU SKIN",sku:official.sku,
    category:g.category,subcategory_slugs:g.sub,product_line:null,status:"draft",
    short_description:official.label.slice(0,500),
    description:official.label ? official.label+"." : "",
    price,currency:"UAH",stock_quantity:0,track_stock:true,
    size:official.volumes.length===1?official.volumes[0]:null,
    image_url:url,secondary_image_url:null,
    hover_label:"ПРИЗНАЧЕННЯ",hover_title:null,hover_text:null,
    how_to_use:null,key_ingredients:[],inci:official.inci||null,
    seo_title:null,seo_description:null,seo_keywords:[],
    featured:false,sort_order:position,published_at:null,created_at:now,updated_at:now,
  };
}
async function currentCatalog(env){
  const row=await env.SHOP_DB.prepare(
    "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'").first();
  if(!row)throw Error("Shop D1 product document unavailable");
  const products=JSON.parse(row.content);
  if(!Array.isArray(products) || products.length<250)throw Error("Refusing to update incomplete catalog");
  return {products,version:Number(row.version)};
}
function isApprovedImage(url){
  try{
    const u=new URL(url);
    return u.protocol==="https:"&&u.hostname===SAFE_IMAGE_HOST&&u.pathname.startsWith("/src/media/")&&
      /\.(?:png|jpe?g|webp)$/i.test(u.pathname)&&!u.search&&!u.username&&!u.password;
  }catch{return false;}
}
function extFor(bytes,mime){
  const b=new Uint8Array(bytes);
  if(mime==="image/png"&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return "png";
  if(mime==="image/jpeg"&&b[0]===255&&b[1]===216&&b[2]===255)return "jpg";
  if(mime==="image/webp"&&String.fromCharCode(...b.slice(0,4))==="RIFF")return "webp";
  throw Error("Invalid supplier image format");
}
async function fetchOfficialPhoto(official) {
  if(!isApprovedImage(official.mainImage))throw Error("Unverified official image URL");
  const response=await fetch(official.mainImage,{redirect:"manual",headers:{accept:"image/png,image/jpeg,image/webp"},
    signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("Image HTTP "+response.status);
  if(response.status>=300&&response.status<400)throw Error("Supplier image redirected");
  const length=Number(response.headers.get("content-length")||0);
  if(length>7_000_000)throw Error("Supplier image exceeds 7MB");
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<2500||bytes.byteLength>7_000_000)throw Error("Invalid image bytes");
  const mime=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const ext=extFor(bytes,mime);
  const dimensions=imageDimensions(new Uint8Array(bytes));
  if(!dimensions||dimensions.width<400||dimensions.height<400)
    throw Error("Official image below 400x400");
  return {bytes,mime,ext,dimensions};
}
async function originalIsBetter(env,url,photo){
  if(!url||!url.startsWith("/shop-media/"))return false;
  const key=url.slice("/shop-media/".length);
  // Keep previously verified, larger supplier photos. Replace blurry workbook thumbnails.
  if(!/^products\/[-\w/.]+\.(png|jpe?g|webp)$/i.test(key))return false;
  const obj=await env.SHOP_MEDIA.get(key,{range:{offset:0,length:65536}});
  if(!obj)return false;
  const dimensions=imageDimensions(new Uint8Array(await obj.arrayBuffer()));
  return Boolean(dimensions&&dimensions.width>=photo.dimensions.width*1.3&&
    dimensions.height>=photo.dimensions.height*1.3);
}
async function storePhoto(env,official,photo){
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",photo.bytes));
  const hash=[...digest.slice(0,10)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const key="products/cu-skin-official/"+official.vendorCode+"-"+hash+"."+photo.ext;
  const existing=await env.SHOP_MEDIA.head(key);
  if(!existing)await env.SHOP_MEDIA.put(key,photo.bytes,{httpMetadata:{contentType:photo.mime},
    customMetadata:{vendorCode:official.vendorCode,source:official.sourceUrl}});
  if(!await env.SHOP_MEDIA.head(key))throw Error("Cloudflare R2 write not confirmed");
  return "/shop-media/"+key;
}
async function writeProduct(env,official,url,photo,prices){
  for(let attempt=0;attempt<8;attempt++){
    const {products,version}=await currentCatalog(env);
    const plan=planOfficialProduct(products,official);
    if(plan.kind==="conflict")return {status:"conflict",detail:plan.reason};
    const existing=plan.existing;
    if(existing && existing.image_url===url)return {status:"already",detail:official.sourceUrl};
    if(existing && await originalIsBetter(env,existing.image_url,photo))
      return {status:"kept",detail:"Existing image has greater intrinsic dimensions"};
    const now=new Date().toISOString();
    let next;
    if(existing){
      const patch={...existing,image_url:url,updated_at:now};
      if(plan.linkLegacy)patch.sku=official.sku;
      if(!existing.inci && official.inci)patch.inci=official.inci;
      if(!existing.size&&official.volumes.length===1)patch.size=official.volumes[0];
      if(!existing.short_description&&official.label)patch.short_description=official.label;
      next=products.map(x=>x.id===existing.id?patch:x);
    }else{
      const draft=makeDraft(official,url,now,products.length+1,prices);
      if(products.some(x=>x.slug===draft.slug||x.id===draft.id))
        return {status:"conflict",detail:"Generated ID or slug occupied"};
      next=[...products,draft];
    }
    const changed=await env.SHOP_DB.prepare(
      "UPDATE shop_documents SET content=?,version=version+1,updated_at=datetime('now') WHERE pathname='data/products.json' AND version=?"
    ).bind(JSON.stringify(next),version).run();
    if((changed.meta?.changes||0)>0)return {status:existing?"attached":"created",detail:official.sourceUrl};
  }
  throw Error("Concurrent catalog updates exceeded retry limit");
}
async function recordStatus(env,official,status,detail){
  await env.SHOP_DB.prepare("INSERT INTO shop_cuskin_official_sync(vendor_code,status,detail,checked_at) VALUES(?,?,?,unixepoch()) "+
    "ON CONFLICT(vendor_code) DO UPDATE SET status=excluded.status, detail=excluded.detail,checked_at=excluded.checked_at")
    .bind(official.vendorCode,status,(REVISION+" | "+String(detail||"")).slice(0,230)).run();
}
export async function reconcileOfficial(env,{limit=8,sources=snapshot.products,prices=priceSource.prices_uah,now=Math.floor(Date.now()/1000)}={}) {
  if(!Array.isArray(sources)||sources.length<1||snapshot.sourceCount!==112||
     snapshot.products.length!==112||priceSource.verified_count!==87)
    throw Error("Official catalogue snapshot or retail price manifest is incomplete");
  await env.SHOP_DB.prepare("CREATE TABLE IF NOT EXISTS shop_cuskin_official_sync("+
    "vendor_code TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT,checked_at INTEGER NOT NULL)").run();
  const recent=await env.SHOP_DB.prepare("SELECT vendor_code,status,detail,checked_at FROM shop_cuskin_official_sync").all();
  const attempts=new Map((recent.results||[]).map(row=>[String(row.vendor_code),row]));
  const pending=sources.filter(p=>{
    const item=attempts.get(p.vendorCode);
    if(!item||!String(item.detail||"").startsWith(REVISION+" | "))return true;
    if(STATUSES_DONE.has(item.status))return false;
    if(item.status==="conflict")return false;
    return Number(item.checked_at)<=now-3600;
  }).slice(0,Math.max(0,Math.min(12,limit)));
  const summary={total:sources.length,queued:sources.length-attempts.size,attempted:0,attached:0,created:0,
    kept:0,already:0,conflict:0,error:0};
  for(const official of pending){
    summary.attempted++;
    try{
      const photo=await fetchOfficialPhoto(official);
      const url=await storePhoto(env,official,photo);
      const result=await writeProduct(env,official,url,photo,prices);
      summary[result.status]++;
      await recordStatus(env,official,result.status,result.detail);
    }catch(error){
      summary.error++;
      await recordStatus(env,official,"error",error instanceof Error?error.message:String(error));
    }
  }
  console.log("RESET Shop CU SKIN official catalog",JSON.stringify(summary));
  return summary;
}
export { REVISION as CU_SKIN_REVISION, PREFIX as CU_SKIN_IMAGE_PREFIX };
