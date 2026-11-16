import test from "node:test";
import assert from "node:assert/strict";
import worker, { validIdentity, reconcile } from "../workers/shop-media-sync/index.mjs";

test("identity: protect variants and accept verified supplier title",()=>{
  assert.equal(validIdentity("HydroPeptide Sun & Sleep — тревел-набір для догляду", "Sun & Sleep | HydroPeptide"),true);
  assert.equal(validIdentity("DÉCAAR Rebalancing Cream 24hr — балансувальний крем", "Rebalancing Cream 24hr | DÉCAAR"),true);
  assert.equal(validIdentity("HydroPeptide Sun Slick SPF 50", "HydroPeptide Sun Slick SPF 30"),false);
  assert.equal(validIdentity("CU SKIN Retinol 0.3%", "CU SKIN Retinol 1%"),false);
  assert.equal(validIdentity("Sensilis Make-Up 01", "Sensilis Make-Up 03"),false);
  assert.equal(validIdentity("HydroPeptide A", "HydroPeptide B"),false);
});
function fakeDb(products){
  let data=structuredClone(products),version=1;
  const attempts=new Map(),updates=[];
  const client={
    prepare(sql){
      const query=sql.toLowerCase();
      return {
        bind(...values){
          return {
            async first(){
              if(query.startsWith("select content"))return {content:JSON.stringify(data),version};
              throw Error("Unrecognized first "+sql);
            },
            async all(){
              if(query.startsWith("select slug from shop_media_sync_attempts"))
                return {results:[...attempts.entries()].filter(([,v])=>v.checked_at>values[0]).map(([slug])=>({slug}))};
              throw Error("Unrecognized all "+sql);
            },
            async run(){
              if(query.startsWith("insert into shop_media_sync_attempts")){
                attempts.set(values[0],{status:values[1],detail:values[2],checked_at:Math.floor(Date.now()/1000)});
                return {meta:{changes:1}};
              }
              if(query.startsWith("update shop_documents")){
                if(values[1]!==version)return {meta:{changes:0}};
                data=JSON.parse(values[0]);version++;updates.push(data);
                return {meta:{changes:1}};
              }
              throw Error("Unrecognized run "+sql);
            },
          };
        },
        async run(){
          if(query.startsWith("create table"))return {meta:{changes:0}};
          throw Error("Unrecognized table run "+sql);
        }
      };
    }
  };
  return {client,read:()=>data,updates,attempts};
}
test("cron: independently fetch image, verify R2 object, update only D1 image_url",async()=>{
  const product={
    id:"hp-1",slug:"supplier-hydropeptide-sun-sleep",brand:"HydroPeptide",
    name:"HydroPeptide Sun & Sleep — тревел-набір",sku:null,status:"draft",
    price:4342.17,stock_quantity:0,track_stock:true,sale_price:null,image_url:null,
  };
  const current={...product,id:"hp-existing",slug:"existing",image_url:"/shop-media/old.webp"};
  const other={...product,id:"other",slug:"supplier-hydropeptide-sun-slick-spf-50",
    name:"HydroPeptide Sun Slick SPF 50"};
  const db=fakeDb([product,current,other]);
  const objects=new Map();
  const env={
    SHOP_DB:db.client,
    SHOP_MEDIA:{
      async put(key,data,meta){objects.set(key,{data,meta});},
      async head(key){return objects.get(key)||null;}
    }
  };
  const originalFetch=globalThis.fetch;
  let accesses=0;
  globalThis.fetch=async (url)=>{
    accesses++;
    if(url==="https://hydropeptide.ua/product/sun-sleep/"){
      return new Response('<title>Sun & Sleep | HydroPeptide</title><h1>Sun & Sleep</h1>'+
        '<meta property="og:image" content="https://hydropeptide.ua/wp-content/uploads/sun-sleep.jpg"/>',
        {status:200,headers:{"content-type":"text/html"}});
    }
    if(url==="https://hydropeptide.ua/wp-content/uploads/sun-sleep.jpg"){
      const bytes=new Uint8Array(3000);bytes[0]=255;bytes[1]=216;bytes[2]=255;
      return new Response(bytes,{status:200,headers:{"content-type":"image/jpeg"}});
    }
    if(url==="https://hydropeptide.com/products/sun-slick"){
      return new Response('<h1>Sun Slick SPF 30 | HydroPeptide</h1>'+
        '<meta property="og:image" content="https://cdn.shopify.com/images/not-the-right-spf.webp"/>',
        {status:200,headers:{"content-type":"text/html"}});
    }
    throw Error("Unexpected network request "+url);
  };
  try {
    const report=await reconcile(env,Math.floor(Date.now()/1000));
    assert.equal(report.attached,1);
    assert.equal(report.skipped,1);
    assert.equal(db.updates.length,1);
    const ready=db.read().find(p=>p.id==="hp-1");
    assert.ok(ready.image_url.startsWith("/shop-media/products/official-auto/supplier-hydropeptide-sun-sleep-"));
    assert.equal(ready.status,"draft");
    assert.equal(ready.price,4342.17);
    assert.equal(ready.stock_quantity,0);
    assert.equal(ready.sale_price,null);
    assert.deepEqual(db.read().find(p=>p.id==="hp-existing"),current);
    assert.equal(db.read().find(p=>p.id==="other").image_url,null);
    assert.equal(objects.size,1);
    const [key,entry]=[...objects.entries()][0];
    assert.ok(key.endsWith(".jpg"));
    assert.equal(entry.meta.httpMetadata.contentType,"image/jpeg");
    assert.equal(db.attempts.get("supplier-hydropeptide-sun-sleep").status,"attached");
    assert.equal(db.attempts.get("supplier-hydropeptide-sun-slick-spf-50").status,"unresolved");
    const before=accesses;
    const again=await reconcile(env,Math.floor(Date.now()/1000));
    assert.equal(again.attached,0);
    assert.equal(accesses,before,"No retry loop for unresolved item");
    assert.equal(db.updates.length,1);
    assert.equal((await worker.fetch()).status,404,"No exposed public mutation route");
  }finally{globalThis.fetch=originalFetch;}
});
