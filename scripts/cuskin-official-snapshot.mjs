#!/usr/bin/env node
/**
 * Read-only audit of the public CU SKIN product API used by cu.ua.
 * Captures product identities, variant facts and official product-image URLs.
 * This script does not access/reset Cloudflare, prices, stock or orders.
 */
import fs from "node:fs/promises";
const API="https://key.cu.ua/api/";
const SOURCE="https://cu.ua/";
const OUT="data/cu-skin-official-snapshot.json";
const withTimeout=(u)=>fetch(u,{headers:{accept:"application/json","user-agent":"RESET Shop public catalogue audit/1.0"},
  signal:AbortSignal.timeout(20000)});
function validImage(value){
  try{const u=new URL(value);return u.protocol==="https:"&&u.hostname==="key.cu.ua"&&
    u.pathname.startsWith("/src/media/")&&/\.(?:png|jpe?g|webp)$/i.test(u.pathname)?u.href:null;}catch{return null;}
}
function normalize(item){
  const code=String(item.vendorCode||"").trim();
  if(!/^\d{2,4}$/.test(code))throw Error("No safe vendorCode: "+code);
  const title=String(item.name||item.title||"").replace(/\s+/g," ").trim();
  if(title.length<5)throw Error("No safe product title: "+code);
  const volume=(Array.isArray(item.volumes)?item.volumes:[]).map(v=>String(v.name||"").trim()).filter(Boolean);
  const categories=(Array.isArray(item.categories)?item.categories:[]).map(v=>String(v.name||"").trim()).filter(Boolean);
  return {
    vendorCode:code,
    sku:/^\d{3}$/.test(code)?"300"+code:null,
    name:title,
    label:String(item.label||"").replace(/\s+/g," ").trim().slice(0,180),
    categoryNames:categories,
    volumes:volume,
    mainImage:validImage(item.mainImage),
    thumbnail:validImage(item.image),
    inci:String(item.ingredients||"").trim().slice(0,8000),
    sourceUrl:SOURCE+encodeURIComponent(code),
  };
}
async function collect(){
  const items=[],seen=new Set();let count=null;
  for(let page=1;page<=6;page++){
    const u=API+"products/?page_size=100&page="+page;
    const res=await withTimeout(u);
    if(!res.ok)throw Error("Official API "+res.status+" page "+page);
    const data=await res.json();
    if(!Array.isArray(data.results)||!Number.isInteger(data.count))throw Error("Unrecognized official API schema");
    count=data.count;
    for(const raw of data.results){
      const item=normalize(raw);
      if(seen.has(item.vendorCode))throw Error("Duplicate vendorCode "+item.vendorCode);
      seen.add(item.vendorCode);items.push(item);
    }
    if(page>=Number(data.total_pages)||!data.next)break;
  }
  if(items.length!==count||items.length<95||items.length>200)throw Error("Incomplete official API: "+items.length+"/"+count);
  return {source:SOURCE,api:API,sourceCount:count,products:items};
}
const snapshot=await collect();
const products=snapshot.products;
const report={
  sourceCount:snapshot.sourceCount,
  extracted:products.length,
  withSku:products.filter(p=>p.sku).length,
  withMainImage:products.filter(p=>p.mainImage).length,
  withOnlyThumbnail:products.filter(p=>!p.mainImage&&p.thumbnail).length,
  noImage:products.filter(p=>!p.mainImage&&!p.thumbnail).map(p=>p.vendorCode),
  sample:products.slice(0,5).map(p=>({sku:p.sku,name:p.name,volumes:p.volumes,mainImage:p.mainImage})),
  last:products.slice(-4).map(p=>({sku:p.sku,name:p.name}))
};
console.log("CU_SNAPSHOT",JSON.stringify(report));
if(process.argv.includes("--write")){
  await fs.writeFile(OUT,JSON.stringify(snapshot,null,2)+"\n","utf8");
  console.log("CU_SNAPSHOT_WRITTEN",OUT);
}
