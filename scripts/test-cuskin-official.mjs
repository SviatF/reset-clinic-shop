import test from "node:test";
import assert from "node:assert/strict";
import { planOfficialProduct,reconcileOfficial } from "../workers/shop-media-sync/cuskin-official.mjs";

const official={
  vendorCode:"151",sku:"300151",name:"CU: Vitamin U Aqua Sun Gel SPF 50+ PA+++",
  label:"Сонцезахисний крем-гель",categoryNames:["Захист від сонця"],
  volumes:["50 мл"],mainImage:"https://key.cu.ua/src/media/470_470_test.png",
  thumbnail:"https://key.cu.ua/src/media/280_280_test.png",inci:"Water, Glycerin",
  sourceUrl:"https://cu.ua/151",
};
const base={
  id:"cu-existing",slug:"cuskin-existing",brand:"CU SKIN",sku:"300151",name:"CU SKIN Vitamin U Aqua Sun Gel SPF 50+ PA+++",
  size:"50мл",status:"active",price:1999,sale_price:1499,stock_quantity:15,track_stock:true,
  image_url:"/shop-media/products/2026-11-16/tiny.png",description:"Merchant product copy",
  category:"face",subcategory_slugs:["spf"]
};
function png(w,h){
 const bytes=new Uint8Array(3000);
 bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82],0);
 const write=(i,n)=>{bytes[i]=n>>>24;bytes[i+1]=(n>>>16)&255;bytes[i+2]=(n>>>8)&255;bytes[i+3]=n&255};
 write(16,w);write(20,h);return bytes;
}
function fakeEnvironment(initial) {
 let rows=structuredClone(initial),version=3;
 const attempts=new Map(),objects=new Map(),writes=[];
 return {
  writes,attempts,objects,read:()=>rows,
  SHOP_DB:{
   prepare(sql){
    const q=sql.toLowerCase();
    return {
      async run(){if(q.startsWith("create table"))return {meta:{changes:0}};throw Error("unexpected run "+sql)},
      async first(){if(q.startsWith("select content"))return {content:JSON.stringify(rows),version};throw Error("unexpected first "+sql)},
      bind(...values){return {
        async run(){
         if(q.startsWith("insert into shop_cuskin_official_sync")){
           attempts.set(values[0],{vendor_code:values[0],status:values[1],detail:values[2],checked_at:Math.floor(Date.now()/1000)});
           return {meta:{changes:1}};
         }
         if(q.startsWith("update shop_documents")){
           if(Number(values[1])!==version)return {meta:{changes:0}};
           rows=JSON.parse(values[0]);version++;writes.push(rows);return {meta:{changes:1}};
         }
         throw Error("unexpected bound run "+sql);
        },
      };
      },
      async all(){if(q.startsWith("select vendor_code"))return {results:[...attempts.values()]};throw Error("unexpected all "+sql)},
    };
   }
  },
  SHOP_MEDIA:{
   async get(key){
    if(key.includes("tiny.png"))return {arrayBuffer:async()=>png(100,140).buffer};
    if(key.includes("legacy-opaque.png"))return {arrayBuffer:async()=>png(800,900).buffer};
    if(key.includes("merchant-cutout.png"))return {arrayBuffer:async()=>png(1000,1100).buffer};
    return null;
   },
   async head(key){return objects.get(key)||null},
   async put(key,data,meta){objects.set(key,{data,meta})},
  }
 }
}
function manyRows(baseRows){
 return [...baseRows,...Array.from({length:250},(_,i)=>({id:"other-"+i,sku:null,
  slug:"other-"+i,brand:"HydroPeptide",name:"Other",image_url:null}))];
}
test("exact article matches without replacing price, discounts, stock, publication",()=>{
 assert.equal(planOfficialProduct([base],official).kind,"update");
 assert.equal(planOfficialProduct([{...base,size:"50 г"}],official).kind,"update","Exact SKU tolerates supplier mass/volume notation");
 assert.equal(planOfficialProduct([{...base,size:"7 г"}],official).kind,"conflict","Different quantity stays blocked");
 assert.equal(planOfficialProduct([{...base,size:"7 мл"}],official).kind,"conflict");
 assert.equal(planOfficialProduct([{...base,sku:"CU-SKIN-002",size:"50 мл",name:"CU SKIN Another Product"}],official).kind,"create");
 assert.equal(planOfficialProduct([base,{...base,id:"duplicate"}],official).kind,"conflict");
 assert.equal(planOfficialProduct([{...base,sku:"CU-SKIN-002",size:"50 г",name:official.name}],official).kind,"create","Legacy name matching cannot use g/ml exception");
});
test("official 470px photo replaces workbook thumbnail, preserving all commercial fields",async()=>{
 const env=fakeEnvironment(manyRows([base]));
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url)=> {
   assert.equal(url,official.mainImage);
   return new Response(png(470,470),{status:200,headers:{"content-type":"image/png"}});
 };
 try{
  const result=await reconcileOfficial(env,{sources:[official],prices:{"300151":1134},limit:1});
  assert.equal(result.attached,1);
  assert.equal(env.writes.length,1);
  const now=env.read()[0];
  assert.equal(now.id,base.id);
  assert.equal(now.price,1999);
  assert.equal(now.sale_price,1499);
  assert.equal(now.stock_quantity,15);
  assert.equal(now.status,"active");
  assert.equal(now.description,"Merchant product copy");
  assert.equal(now.sku,"300151");
  assert.ok(now.image_url.startsWith("/shop-media/products/cu-skin-official/151-"));
  assert.equal(env.objects.size,1);
  const again=await reconcileOfficial(env,{sources:[official],prices:{"300151":1134},limit:1});
  assert.equal(again.attempted,0);
 }finally{globalThis.fetch=oldFetch;}
});
test("new official SKU creates a safe draft at verified retail price",async()=>{
 const env=fakeEnvironment(manyRows([]));
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(png(470,470),{status:200,headers:{"content-type":"image/png"}});
 try{
  const result=await reconcileOfficial(env,{sources:[official],prices:{"300151":1134},limit:1});
  assert.equal(result.created,1);
  const row=env.read().find(p=>p.sku==="300151");
  assert.equal(row.price,1134);
  assert.equal(row.status,"draft");
  assert.equal(row.stock_quantity,0);
  assert.ok(row.image_url.includes("/cu-skin-official/"));
 }finally{globalThis.fetch=oldFetch;}
});
test("official products without a verified price cannot silently go on sale",async()=>{
 const env=fakeEnvironment(manyRows([]));
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(png(470,470),{status:200,headers:{"content-type":"image/png"}});
 try{
  const result=await reconcileOfficial(env,{sources:[official],prices:{},limit:1});
  assert.equal(result.created,1);
  const row=env.read().find(p=>p.sku==="300151");
  assert.equal(row.price,0);
  assert.equal(row.status,"draft");
 }finally{globalThis.fetch=oldFetch;}
});


test("CU SKIN multipack: identical numbers in different separator formats match the same canonical SKU",()=>{
 const pad={...official,vendorCode:"260",sku:"300260",name:"CU Dr.Solution Cicaming Centeca B5 Pad",volumes:["160г 80шт"]};
 const sachet={...official,vendorCode:"257",sku:"300257",name:"CU Dr. Solution B6 Enzyme Powder Wash Sachet",volumes:["20 шт * 1г"]};
 const padOld={...base,sku:"300260",size:"160г-80шт",name:"CU SKIN CU DR.SOLUTION CICAMING CENTECA B5 PAD"};
 const sachetOld={...base,sku:"300257",size:"1г*20шт",name:"CU SKIN CU Dr. Solution B6 Enzyme Powder Wash Sachet"};
 assert.equal(planOfficialProduct([padOld],pad).kind,"update");
 assert.equal(planOfficialProduct([sachetOld],sachet).kind,"update");
 assert.equal(planOfficialProduct([{...padOld,size:"160г-40шт"}],pad).kind,"conflict","Different pack quantities remain blocked");
 assert.equal(planOfficialProduct([{...sachetOld,size:"1г*10шт"}],sachet).kind,"conflict","Different sachet counts remain blocked");
 const cc={...official,vendorCode:"153",sku:"300153",name:"CU: VITAMIN U CC CREAM SPF 40 / PA+++",volumes:["45 мл"]};
 const spf38={...base,sku:"300153",name:"CU SKIN VITAMIN U CC CREAM SPF 38+ РА+++",size:"45мл"};
 assert.equal(planOfficialProduct([spf38],cc).kind,"conflict","SPF38 and SPF40 must not silently share an image");
});

test("opaque 800x900 old photo is upgraded to exact SKU transparent PNG after revision bump",async()=>{
 const row={...base,image_url:"/shop-media/products/official-auto/legacy-opaque.png"};
 const env=fakeEnvironment(manyRows([row]));
 env.attempts.set("151",{
   vendor_code:"151",status:"kept",
   detail:"cu-official-2026-11-18-v3 | Existing image has greater intrinsic dimensions",
   checked_at:Math.floor(Date.now()/1000)
 });
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response(png(470,470),{status:200,headers:{"content-type":"image/png"}});
 try{
   const result=await reconcileOfficial(env,{sources:[official],prices:{"300151":1134},limit:1});
   assert.equal(result.attached,1,"Old opaque kept image should be replaced, not skipped");
   assert.ok(env.read()[0].image_url.includes("/cu-skin-official/"));
   assert.equal(env.read()[0].sale_price,1499,"Merchant discount must remain");
   assert.equal(env.read()[0].price,1999);
   assert.equal(env.read()[0].stock_quantity,15);
 }finally{globalThis.fetch=previous;}
});
test("genuinely larger merchant-cutout photo is never replaced by smaller 470px source",async()=>{
 const row={...base,image_url:"/shop-media/products/merchant-cutout.png"};
 const env=fakeEnvironment(manyRows([row]));
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response(png(470,470),{status:200,headers:{"content-type":"image/png"}});
 try{
   const result=await reconcileOfficial(env,{sources:[official],prices:{"300151":1134},limit:1});
   assert.equal(result.kept,1);
   assert.equal(env.read()[0].image_url,row.image_url);
   assert.equal(env.read()[0].price,row.price);
 }finally{globalThis.fetch=previous;}
});
