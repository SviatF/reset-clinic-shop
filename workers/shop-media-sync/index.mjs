import verified from "../../data/verified-supplier-photo-pages.json" with { type: "json" };
import { imageDimensions, betterPhoto } from "./image-dimensions.mjs";
import { reconcileOfficial } from "./cuskin-official.mjs";

// Cloudflare Cron job: no public write endpoint, no admin clicking.
// Bump this identifier whenever source detection or matching improves, so
// previously unresolved entries are retried immediately after deployment.
const MATCHER_REVISION="supplier-gallery-2026-11-17-r3";
const HOSTS = {
  "HydroPeptide":["hydropeptide.ua","hydropeptide.com","www.hydropeptide.com"],
  "Sensilis":["sensilis.com.ua","www.sensilis.com.ua"],
  "DÉCAAR":["decaar.com.ua","www.decaar.com.ua"],
  "CU SKIN":["cu.ua","www.cu.ua","cuskin.com","www.cuskin.com"],
  "OLIE'RE PARIS":["oliere.paris","www.oliere.paris"],
  "Cetaphil":["cetaphil.ua","www.cetaphil.ua","cetaphil.com","www.cetaphil.com"],
};
const IGNORE=new Set(["hydropeptide","sensilis","decaar","cuskin","oliere","paris","cetaphil","dr","solution","clean","the","and","for","skin","spf","with","body","day"]);
function decodeHtml(value) {
 return String(value||"").replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|nbsp|lt|gt|ndash|mdash);/gi,(_,entity)=>{
   const name=entity.toLowerCase();
   const named={amp:"&",quot:'"',apos:"'",nbsp:" ",lt:"<",gt:">",ndash:"–",mdash:"—"};
   if(named[name]!==undefined)return named[name];
   const hex=name.startsWith("#x");
   const code=Number.parseInt(name.slice(hex?2:1),hex?16:10);
   return Number.isInteger(code)&&code>0&&code<=0x10ffff?String.fromCodePoint(code):" ";
 });
}
const normalize=s=>decodeHtml(s).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/(\d+),(\d+)/g,"$1.$2").replace(/[^a-z0-9а-яіїєґ.%+]+/giu," ").replace(/\s+/g," ").trim();
const distinctive=s=>normalize(decodeHtml(s).split(/[—–]/)[0]).split(" ")
 .filter(t=>t.length>2&&!IGNORE.has(t));
function attributes(text){
 const t=normalize(text);
 return {percent:[...t.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1])).sort().join(","),
   spf:t.match(/spf\s*(\d{1,3})/i)?.[1]||null,
   volume:[...new Set([...t.matchAll(/(\d+(?:\.\d+)?)\s*(мл|ml|г|gr|g|oz)(?![a-zа-яіїєґ])/giu)]
      .map(m=>({ml:"ml","мл":"ml","г":"g",gr:"g",g:"g",oz:"oz"})[m[2]]+":"+Number(m[1])))].sort().join(","),
   shade:String(text||"").match(/[№#]\s*(\d{1,3})/i)?.[1]||t.match(/(?:shade|тон|відтінок|make\s+up|cushion)\s*(\d{1,3})/i)?.[1]||null,
   type:["bb","cc","retinol","retinal","bakuchiol","tinted","non tinted","kids"].filter(w=>new RegExp("\\b"+w+"\\b","i").test(t)).join(","),
   form:["cream","toner","serum","ampoule","lotion","mask","gel","foam","cleanser","scrub","essence","peeling","powder","bb","cc"]
     .filter(w=>new RegExp("\\b"+w+"\\b","i").test(t)).join(",")};
}
export function validIdentity(first,second){
 const a=attributes(first),b=attributes(second);
 for(const k of ["percent","spf","volume","shade","type","form"])
   if(a[k]&&b[k]&&a[k]!==b[k])return false;
 const x=new Set(distinctive(first)),y=new Set(distinctive(second));
 const intersection=[...x].filter(w=>y.has(w));
 return Boolean(x.size&&y.size&&intersection.length>=Math.min(2,x.size)
   &&intersection.length/Math.max(x.size,y.size)>=0.55);
}
function allowed(url,brand,image=false){
 try{
   const u=new URL(url);
   const hosts=HOSTS[brand];
   if(!hosts||u.protocol!=="https:"||u.port||u.username||u.password)return null;
   if(!hosts.includes(u.hostname)&&!(image&&u.hostname==="cdn.shopify.com"))return null;
   if(image&&(!/\.(?:png|jpe?g|webp)$/i.test(u.pathname)||/(logo|favicon|icon)/i.test(u.pathname)))return null;
   return u;
 }catch{return null;}
}
function meta(html,name){
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
   const attr=tag.match(/\b(?:property|name)\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
   if((attr?.[1]||attr?.[2])!==name)continue;
   const val=tag.match(/\bcontent\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
   if(val)return decodeHtml(val[1]||val[2]);
 }
 return null;
}
function tag(html,name){
 const r=new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i");
 return decodeHtml((html.match(r)?.[1]||"").replace(/<[^>]+>/g," "));
}
function tagAttribute(tag,name) {
 const pattern=new RegExp("\\b"+name+"\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)')","i");
 const hit=tag.match(pattern);
 return hit?decodeHtml(hit[1]||hit[2]):null;
}
/** Only a product's main zoom image. Never use recommendations or logos. */
export function officialMainGalleryImage(html,page,brand) {
 if(brand!=="Sensilis")return null;
 const photos=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
 const primary=photos.find(image=>tagAttribute(image,"id")==="zoom");
 if(primary){
   const raw=tagAttribute(primary,"data-zoom-image")||tagAttribute(primary,"src");
   try {
     const url=new URL(raw,page);
     if(allowed(url.href,brand,true))return url.href;
   }catch{}
 }
 return null;
}

async function get(url,brand,accept="text/html"){
 const image=accept.startsWith("image/");
 let current=url;
 for(let hop=0;hop<3;hop++){
   if(!allowed(current,brand,image))throw Error("Blocked source host or redirect");
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
   let response;
   try {
     response=await fetch(current,{method:"GET",redirect:"manual",cache:"no-store",signal:ctrl.signal,
       headers:{"Accept":accept,"User-Agent":"Mozilla/5.0 (compatible; RESETShopMediaSync/1.0)"}});
   }finally{clearTimeout(timeout);}
   if([301,302,303,307,308].includes(response.status)){
     const redirect=response.headers.get("location");
     if(!redirect)throw Error("Redirect has no location");
     const next=new URL(redirect,current).href;
     if(!allowed(next,brand,image))throw Error("Blocked redirect host");
     current=next;
     continue;
   }
   if(!response.ok)throw Error("Source HTTP "+response.status);
   return response;
 }
 throw Error("Too many source redirects");
}
async function page(url,brand){
 const res=await get(url,brand);
 if(!(res.headers.get("content-type")||"").includes("text/html"))throw Error("Not HTML");
 if(Number(res.headers.get("content-length")||0)>1_600_000)throw Error("Oversized page");
 const html=await res.text();
 if(html.length>1_600_000)throw Error("Oversized page");
 return html;
}
function siteSearch(product) {
 const words=distinctive(product.name).slice(0,5).join(" ");
 if(!words)return [];
 const q=encodeURIComponent(words);
 switch(product.brand){
   case "HydroPeptide": return ["https://hydropeptide.ua/?post_type=product&s="+q,
     "https://hydropeptide.com/search?q="+q];
   case "Sensilis": return ["https://sensilis.com.ua/?s="+q];
   case "DÉCAAR": return ["https://decaar.com.ua/index.php?route=product/search&search="+q];
   case "CU SKIN": return ["https://cu.ua/?s="+q,"https://cuskin.com/?s="+q];
   case "OLIE'RE PARIS": return ["https://oliere.paris/search?q="+q];
   case "Cetaphil": return ["https://www.cetaphil.com/search?q="+q];
   default: return [];
 }
}
function links(html,url,brand){
 const list=[],base=new URL(url);
 for(const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)){
   try{
     const dest=new URL((match[1]||match[2]).replace(/&amp;/g,"&"),base);
     if(!allowed(dest.href,brand)||/cart|login|account|checkout|search|category|catalog/i.test(dest.pathname))continue;
     if(!list.includes(dest.href))list.push(dest.href);
     if(list.length>=24)break;
   }catch{}
 }
 return list;
}
async function findPhoto(product){
 const known=verified[product.slug] ||
   (product.slug==="profesiinyi-nabir-dlia-ukladannia-volossia-studio-olie-re-paris" ?
   {brand:"OLIE'RE PARIS",page:"https://oliere.paris/products/profesiynyy-nabor-dlya-ukladannya-volossya-studio-oliere-paris",
    title:"Професійний набір для укладання волосся Studio OLIE'RE PARIS"} : null);
 let candidates=[],diagnostic="No candidate product page";
 if(known?.brand===product.brand&&allowed(known.page,product.brand))
   candidates=[{url:known.page,title:known.title}];
 else for(const search of siteSearch(product)){
   try{
     const html=await page(search,product.brand);
     candidates=links(html,search,product.brand).slice(0,6).map(url=>({url,title:null}));
     if(candidates.length)break;
     diagnostic="Search returned no product links";
   }catch(error){
     diagnostic="Search unavailable: "+(error instanceof Error?error.message:String(error));
   }
 }
 for(const candidate of candidates.slice(0,7)){
   try{
     if(candidate.title&&!validIdentity(product.name,candidate.title)){
       diagnostic="Supplier mapping title differs from product";
       continue;
     }
     const html=await page(candidate.url,product.brand);
     const actual=[tag(html,"h1"),meta(html,"og:title"),tag(html,"title")].filter(Boolean);
     const identity=candidate.title||product.name;
     if(!actual.some(title=>validIdentity(identity,title)&&validIdentity(product.name,title))){
       diagnostic=actual.length?"Product page title differs":"No product title on source page";
       continue;
     }
     const image=meta(html,"og:image")||meta(html,"og:image:secure_url")||meta(html,"twitter:image");
     const gallery=officialMainGalleryImage(html,candidate.url,product.brand);
     const dest=image?new URL(image,candidate.url):null;
     const sourceImage=dest&&allowed(dest.href,product.brand,true)?dest.href:gallery;
     if(!sourceImage){
       diagnostic="No allowed main product image";
       continue;
     }
     return {url:sourceImage,page:candidate.url};
   }catch(error){
     diagnostic="Product page unavailable: "+(error instanceof Error?error.message:String(error));
   }
 }
 return {reason:diagnostic};
}
function imageExt(bytes,mime){
 const text=String.fromCharCode(...bytes.slice(0,12));
 if(mime==="image/webp"&&text.startsWith("RIFF")&&text.slice(8,12)==="WEBP")return "webp";
 if(mime==="image/png"&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return "png";
 if((mime==="image/jpeg"||mime==="image/pjpeg")&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "jpg";
 return null;
}
async function binaryPhoto(source,brand){
 const res=await get(source.url,brand,"image/webp,image/png,image/jpeg");
 if(Number(res.headers.get("content-length")||0)>7_000_000)throw Error("Photo too large");
 const bytes=new Uint8Array(await res.arrayBuffer());
 if(bytes.length<2500||bytes.length>7_000_000)throw Error("Invalid photo byte length");
 const ext=imageExt(bytes,(res.headers.get("content-type")||"").split(";")[0].trim().toLowerCase());
 if(!ext)throw Error("Invalid photo bytes or MIME");
 return {bytes,ext,mime:"image/"+(ext==="jpg"?"jpeg":ext),dimensions:imageDimensions(bytes)};
}
async function catalog(env){
 const doc=await env.SHOP_DB.prepare(
   "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'").first();
 if(!doc||!Array.isArray(JSON.parse(doc.content)))throw Error("Missing D1 product catalog");
 return {rows:JSON.parse(doc.content),version:Number(doc.version)};
}
async function status(env,slug,state,detail){
 const loggedDetail=MATCHER_REVISION+" | "+String(detail||"");

 await env.SHOP_DB.prepare(
   "INSERT INTO shop_media_sync_attempts(slug,status,detail,checked_at) VALUES(?,?,?,unixepoch()) "+
   "ON CONFLICT(slug) DO UPDATE SET status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at"
 ).bind(slug,state,loggedDetail.slice(0,230)).run();
}
async function attach(env,product,source,photo,expectedImageUrl=null){
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",photo.bytes));
 const fingerprint=[...digest.slice(0,8)].map(b=>b.toString(16).padStart(2,"0")).join("");
 const key="products/official-auto/"+product.slug+"-"+fingerprint+"."+photo.ext;
 await env.SHOP_MEDIA.put(key,photo.bytes,{httpMetadata:{contentType:photo.mime},
   customMetadata:{slug:product.slug,source:source.page}});
 if(!await env.SHOP_MEDIA.head(key))throw Error("Photo not stored in R2");
 const url="/shop-media/"+key;
 for(let attempt=0;attempt<6;attempt++){
   const {rows,version}=await catalog(env);
   const match=rows.find(p=>p.id===product.id&&p.slug===product.slug&&p.brand===product.brand);
   if(!match || (expectedImageUrl===null?Boolean(match.image_url):match.image_url!==expectedImageUrl))return "skipped";
   const next=rows.map(p=>p.id===product.id?{...p,image_url:url,updated_at:new Date().toISOString()}:p);
   const result=await env.SHOP_DB.prepare("UPDATE shop_documents "+
     "SET content=?,version=version+1,updated_at=datetime('now') "+
     "WHERE pathname='data/products.json' AND version=?")
     .bind(JSON.stringify(next),version).run();
   if((result.meta?.changes||0)>0)return "attached";
 }
 throw Error("Concurrent update to D1, retry later");
}
async function lowResolutionR2Photo(env,product) {
  if(product.brand!=="CU SKIN" || !product.image_url?.startsWith("/shop-media/products/") ||
     product.image_url.includes("/official-auto/") ||
     product.image_url.includes("/cu-skin-official/"))return null;
  const key=product.image_url.slice("/shop-media/".length);
  if(!/^products\/[-\w/.]+\.(?:jpg|jpeg|png|webp)$/i.test(key))return null;
  const head=await env.SHOP_MEDIA.get(key,{range:{offset:0,length:65536}});
  if(!head)return null;
  const dimensions=imageDimensions(new Uint8Array(await head.arrayBuffer()));
  if(!dimensions || Math.max(dimensions.width,dimensions.height)>=550 ||
    dimensions.width*dimensions.height>=250000)return null;
  return dimensions;
}
export async function reconcile(env,now=Math.floor(Date.now()/1000)){
 await env.SHOP_DB.prepare("CREATE TABLE IF NOT EXISTS shop_media_sync_attempts ("+
   "slug TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT,checked_at INTEGER NOT NULL)").run();
 const {rows}=await catalog(env);
 const checked=await env.SHOP_DB.prepare(
   "SELECT slug,status,detail FROM shop_media_sync_attempts WHERE checked_at>?")
   .bind(now-12*3600).all();
 // A newer matcher revision must not inherit a 12-hour negative cache.
 const recent=new Set((checked.results||[])
   .filter(row=>String(row.detail||"").startsWith(MATCHER_REVISION+" | "))
   .map(row=>row.slug));
 const missing=rows.filter(p=>p&&p.slug&&p.brand&&p.name&&!p.image_url&&
   HOSTS[p.brand]&&!recent.has(p.slug));
 missing.sort((a,b)=>Number(Boolean(verified[b.slug]))-Number(Boolean(verified[a.slug])));
 // Ensure blurry CU SKIN thumbnails are not starved by a large backlog of
 // completely missing images. Each run reserves two of six photo slots for
 // upgrades, but falls back to missing images if no upgrades are eligible.
 const pending=missing.slice(0,4).map(product=>({product,originalDimensions:null}));
 const cuCandidates=rows.filter(p=>p?.brand==="CU SKIN" && p.image_url &&
    !recent.has(p.slug)).slice(0,24);
 let upgrades=0;
 for(const product of cuCandidates){
   if(upgrades>=2)break;
   try{
     const originalDimensions=await lowResolutionR2Photo(env,product);
     if(originalDimensions){pending.push({product,originalDimensions});upgrades++;}
   }catch(e){console.warn("CU SKIN image inspection failed",product.slug,String(e));}
 }
 if(pending.length<6){
   pending.push(...missing.slice(4,4+(6-pending.length))
      .map(product=>({product,originalDimensions:null})));
 }
 const summary={pending:missing.length,attempted:0,attached:0,upgraded:0,skipped:0,failed:0};
 for(const {product,originalDimensions} of pending.slice(0,6)){
   summary.attempted++;
   try{
     const source=await findPhoto(product);
     if(!source.url){summary.skipped++;await status(env,product.slug,"unresolved",source.reason||"No exact supplier image");continue;}
     const image=await binaryPhoto(source,product.brand);
     if(originalDimensions && !betterPhoto(originalDimensions,image.dimensions)){
       summary.skipped++;
       await status(env,product.slug,"unresolved","Official image is not sufficiently better than the existing thumbnail");
       continue;
     }
     const result=await attach(env,product,source,image,originalDimensions?product.image_url:null);
     summary[result==="attached"?(originalDimensions?"upgraded":"attached"):"skipped"]++;
     await status(env,product.slug,result==="attached"&&originalDimensions?"upgraded":result,source.page);
   }catch(e){
     summary.failed++;
     await status(env,product.slug,"error",e instanceof Error?e.message:String(e));
   }
 }
 console.log("RESET Shop photo synchronization",JSON.stringify(summary));
 return summary;
}
export default {
 async scheduled(_event,env,context){
   context.waitUntil((async()=>{
     try { await reconcileOfficial(env,{limit:8}); }
     catch(error){console.error("Official CU SKIN sync failed",error);}
     await reconcile(env);
   })());
 },
 async fetch(){return new Response("Not found",{status:404});},
};
