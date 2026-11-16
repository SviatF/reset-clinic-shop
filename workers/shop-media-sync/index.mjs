import verified from "../../data/verified-supplier-photo-pages.json" with { type: "json" };

// Cloudflare Cron job: no public write endpoint, no admin clicking.
const HOSTS = {
  "HydroPeptide":["hydropeptide.ua","hydropeptide.com","www.hydropeptide.com"],
  "Sensilis":["sensilis.com.ua","www.sensilis.com.ua"],
  "DÉCAAR":["decaar.com.ua","www.decaar.com.ua"],
  "CU SKIN":["cu.ua","www.cu.ua","cuskin.com","www.cuskin.com"],
  "OLIE'RE PARIS":["oliere.paris","www.oliere.paris"],
  "Cetaphil":["cetaphil.ua","www.cetaphil.ua","cetaphil.com","www.cetaphil.com"],
};
const IGNORE=new Set(["hydropeptide","sensilis","decaar","cuskin","oliere","paris","cetaphil","the","and","for","skin","cream","serum","spf","with","gel","body","day"]);
const normalize=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/(\d+),(\d+)/g,"$1.$2").replace(/[^a-z0-9а-яіїєґ.%+]+/giu," ").replace(/\s+/g," ").trim();
const distinctive=s=>normalize(String(s||"").split(/[—–]/)[0]).split(" ")
 .filter(t=>t.length>2&&!IGNORE.has(t));
function attributes(text){
 const t=normalize(text);
 return {percent:[...t.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1])).sort().join(","),
   spf:t.match(/spf\s*(\d{1,3})/i)?.[1]||null,
   volume:[...t.matchAll(/(\d+(?:\.\d+)?)\s*(мл|ml|г|gr|g|oz)(?![a-zа-яіїєґ])/giu)].map(m=>m[2]+":"+Number(m[1])).sort().join(","),
   shade:String(text||"").match(/[№#]\s*(\d{1,3})/i)?.[1]||t.match(/(?:shade|тон|відтінок|make\s+up|cushion)\s*(\d{1,3})/i)?.[1]||null,
   type:["bb","cc","retinol","retinal","bakuchiol","tinted","non tinted","kids"].filter(w=>t.includes(w)).join(",")};
}
export function validIdentity(first,second){
 const a=attributes(first),b=attributes(second);
 for(const k of ["percent","spf","volume","shade","type"])
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
   if(val)return (val[1]||val[2]).replace(/&amp;/g,"&");
 }
 return null;
}
function tag(html,name){
 const r=new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i");
 return (html.match(r)?.[1]||"").replace(/<[^>]+>/g," ");
}
async function get(url,brand,accept="text/html"){
 if(!allowed(url,brand,accept.startsWith("image/")))throw Error("Unapproved supplier host");
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
 try {
   const response=await fetch(url,{method:"GET",redirect:"manual",cache:"no-store",signal:ctrl.signal,
     headers:{"Accept":accept,"User-Agent":"RESET-Shop-Verified-Media-Sync"}});
   if(!response.ok)throw Error("Source HTTP "+response.status);
   return response;
 }finally{clearTimeout(timeout);}
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
 let candidates=[];
 if(known?.brand===product.brand&&allowed(known.page,product.brand))
   candidates=[{url:known.page,title:known.title}];
 else for(const search of siteSearch(product)){
   try{
     const html=await page(search,product.brand);
     candidates=links(html,search,product.brand).slice(0,6).map(url=>({url,title:null}));
     if(candidates.length)break;
   }catch{}
 }
 for(const candidate of candidates.slice(0,7)){
   try{
     if(candidate.title&&!validIdentity(product.name,candidate.title))continue;
     const html=await page(candidate.url,product.brand);
     const actual=[tag(html,"h1"),meta(html,"og:title"),tag(html,"title")].filter(Boolean);
     const identity=candidate.title||product.name;
     if(!actual.some(title=>validIdentity(identity,title)&&validIdentity(product.name,title)))continue;
     const image=meta(html,"og:image")||meta(html,"og:image:secure_url")||meta(html,"twitter:image");
     const dest=new URL(image||"",candidate.url);
     if(!allowed(dest.href,product.brand,true))continue;
     return {url:dest.href,page:candidate.url};
   }catch{}
 }
 return null;
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
 return {bytes,ext,mime:"image/"+(ext==="jpg"?"jpeg":ext)};
}
async function catalog(env){
 const doc=await env.SHOP_DB.prepare(
   "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'").first();
 if(!doc||!Array.isArray(JSON.parse(doc.content)))throw Error("Missing D1 product catalog");
 return {rows:JSON.parse(doc.content),version:Number(doc.version)};
}
async function status(env,slug,state,detail){
 await env.SHOP_DB.prepare(
   "INSERT INTO shop_media_sync_attempts(slug,status,detail,checked_at) VALUES(?,?,?,unixepoch()) "+
   "ON CONFLICT(slug) DO UPDATE SET status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at"
 ).bind(slug,state,String(detail||"").slice(0,230)).run();
}
async function attach(env,product,source,photo){
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
   if(!match||match.image_url)return "skipped";
   const next=rows.map(p=>p.id===product.id?{...p,image_url:url,updated_at:new Date().toISOString()}:p);
   const result=await env.SHOP_DB.prepare("UPDATE shop_documents "+
     "SET content=?,version=version+1,updated_at=datetime('now') "+
     "WHERE pathname='data/products.json' AND version=?")
     .bind(JSON.stringify(next),version).run();
   if((result.meta?.changes||0)>0)return "attached";
 }
 throw Error("Concurrent update to D1, retry later");
}
export async function reconcile(env,now=Math.floor(Date.now()/1000)){
 await env.SHOP_DB.prepare("CREATE TABLE IF NOT EXISTS shop_media_sync_attempts ("+
   "slug TEXT PRIMARY KEY,status TEXT NOT NULL,detail TEXT,checked_at INTEGER NOT NULL)").run();
 const {rows}=await catalog(env);
 const checked=await env.SHOP_DB.prepare(
   "SELECT slug FROM shop_media_sync_attempts WHERE checked_at>?")
   .bind(now-12*3600).all();
 const recent=new Set((checked.results||[]).map(row=>row.slug));
 const pending=rows.filter(p=>p&&p.slug&&p.brand&&p.name&&!p.image_url&&
   HOSTS[p.brand]&&!recent.has(p.slug));
 pending.sort((a,b)=>Number(Boolean(verified[b.slug]))-Number(Boolean(verified[a.slug])));
 const summary={pending:pending.length,attempted:0,attached:0,skipped:0,failed:0};
 for(const product of pending.slice(0,6)){
   summary.attempted++;
   try{
     const source=await findPhoto(product);
     if(!source){summary.skipped++;await status(env,product.slug,"unresolved","No exact supplier image");continue;}
     const image=await binaryPhoto(source,product.brand);
     const result=await attach(env,product,source,image);
     summary[result==="attached"?"attached":"skipped"]++;
     await status(env,product.slug,result,source.page);
   }catch(e){
     summary.failed++;
     await status(env,product.slug,"error",e instanceof Error?e.message:String(e));
   }
 }
 console.log("RESET Shop photo synchronization",JSON.stringify(summary));
 return summary;
}
export default {
 async scheduled(_event,env,context){context.waitUntil(reconcile(env));},
 async fetch(){return new Response("Not found",{status:404});},
};
