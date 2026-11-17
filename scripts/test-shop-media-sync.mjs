import test from "node:test";
import assert from "node:assert/strict";
import worker, { validIdentity, reconcile, officialMainGalleryImage } from "../workers/shop-media-sync/index.mjs";
import { imageDimensions, betterPhoto } from "../workers/shop-media-sync/image-dimensions.mjs";

test("identity: protect variants and accept verified supplier title",()=>{
  assert.equal(validIdentity("HydroPeptide Sun & Sleep — тревел-набір для догляду", "Sun & Sleep | HydroPeptide"),true);
  assert.equal(validIdentity("DÉCAAR Rebalancing Cream 24hr — балансувальний крем", "Rebalancing Cream 24hr | DÉCAAR"),true);
  assert.equal(validIdentity("HydroPeptide Sun & Sleep — тревел-набір","Sun &#038; Sleep &#8211; Тревел набір для догляду"),true);
  assert.equal(validIdentity("HydroPeptide Sun Slick SPF 50", "HydroPeptide Sun Slick SPF 30"),false);
  assert.equal(validIdentity("CU SKIN Retinol 0.3%", "CU SKIN Retinol 1%"),false);
  assert.equal(validIdentity("Sensilis Make-Up 01", "Sensilis Make-Up 03"),false);
  assert.equal(validIdentity("Sensilis Cushion №21", "Sensilis Cushion №23"),false);
  assert.equal(validIdentity("CU SKIN Vitamin U Cream 7мл", "CU SKIN Vitamin U Cream 50мл"),false);
  assert.equal(validIdentity("CU SKIN Bifida Barrier Cream", "CU SKIN Bifida Barrier Toner"),false);
  assert.equal(validIdentity("CU SKIN Retinol Activator 0.5% Cream", "CU SKIN Retinol Activator 1% Cream"),false);
  assert.equal(validIdentity("HydroPeptide A", "HydroPeptide B"),false);
});
function fakeDb(products){
  let data=structuredClone(products),version=1;
  const attempts=new Map(),updates=[];
  const client={
    prepare(sql){
      const query=sql.toLowerCase();
      return {
        async first(){
          if(query.startsWith("select content"))return {content:JSON.stringify(data),version};
          throw Error("Unrecognized direct first "+sql);
        },
        bind(...values){
          return {
            async first(){
              if(query.startsWith("select content"))return {content:JSON.stringify(data),version};
              throw Error("Unrecognized first "+sql);
            },
            async all(){
              if(query.startsWith("select slug,status,detail from shop_media_sync_attempts"))
                return {results:[...attempts.entries()].filter(([,v])=>v.checked_at>values[0]).map(([slug,v])=>({slug,status:v.status,detail:v.detail}))};
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


function fakePng(width,height){
  const bytes=new Uint8Array(3000);
  bytes.set([137,80,78,71,13,10,26,10],0);
  bytes.set([0,0,0,13,73,72,68,82],8);
  const store=(offset,n)=>{bytes[offset]=(n>>>24)&255;bytes[offset+1]=(n>>>16)&255;
    bytes[offset+2]=(n>>>8)&255;bytes[offset+3]=n&255;};
  store(16,width);store(20,height);
  return bytes;
}
test("intrinsic image header parsing and minimum photo-quality improvement",()=>{
  assert.deepEqual(imageDimensions(fakePng(90,74)),{width:90,height:74});
  assert.deepEqual(imageDimensions(fakePng(1000,1000)),{width:1000,height:1000});
  assert.equal(betterPhoto({width:90,height:74},{width:1000,height:1000}),true);
  assert.equal(betterPhoto({width:90,height:74},{width:100,height:100}),false);
  assert.equal(betterPhoto({width:1000,height:1000},{width:1200,height:1200}),false);
  assert.equal(imageDimensions(new Uint8Array(35)),null);
  const jpeg=new Uint8Array([255,216,255,192,0,17,8,0,100,0,200,1,1,17,0,2,17,0,3,17,0,255,217,
    ...new Array(20).fill(0)]);
  assert.deepEqual(imageDimensions(jpeg),{width:200,height:100});
});
test("cron upgrades only an inferior CU SKIN thumbnail with a verified larger official photo",async()=>{
  const product={id:"cu-1",slug:"supplier-cuskin-bifida-barrier-cream",brand:"CU SKIN",
    name:"CU SKIN Dr. Solution Bifida Barrier Cream",sku:"300120",size:"50 мл",
    price:1932,sale_price:1550,stock_quantity:12,track_stock:true,status:"active",
    image_url:"/shop-media/products/2026-11-16/tiny.png"};
  const other={...product,id:"cu-2",slug:"other-original",name:"CU SKIN Vitamin U Cream",
    image_url:"/shop-media/products/2026-11-16/good.png",price:2800};
  const db=fakeDb([product,other]),objects=new Map();
  const originalPhoto=fakePng(90,74),goodPhoto=fakePng(1000,1000);
  const env={SHOP_DB:db.client,SHOP_MEDIA:{
    async get(key){if(key.endsWith("tiny.png"))return {arrayBuffer:async()=>originalPhoto.buffer};
      if(key.endsWith("good.png"))return {arrayBuffer:async()=>goodPhoto.buffer};return null;},
    async put(key,data,metadata){objects.set(key,{data,metadata});},
    async head(key){return objects.get(key)||null;}
  }};
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url)=>{
    if(String(url).startsWith("https://cu.ua/?s="))
      return new Response('<a href="/product/bifida-barrier-cream/">Product</a>',
        {headers:{"content-type":"text/html"}});
    if(url==="https://cu.ua/product/bifida-barrier-cream/")
      return new Response('<h1>CU SKIN Dr. Solution Bifida Barrier Cream</h1>'+
        '<meta property="og:image" content="https://cu.ua/image/bifida-barrier-cream.png">',
        {headers:{"content-type":"text/html"}});
    if(url==="https://cu.ua/image/bifida-barrier-cream.png")
      return new Response(goodPhoto,{headers:{"content-type":"image/png"}});
    throw Error("Unexpected URL "+url);
  };
  try{
    const result=await reconcile(env,Math.floor(Date.now()/1000));
    assert.equal(result.upgraded,1);
    assert.equal(result.attached,0);
    const latest=db.read();
    assert.ok(latest[0].image_url.includes("/products/official-auto/"));
    assert.equal(latest[0].price,1932);
    assert.equal(latest[0].sale_price,1550);
    assert.equal(latest[0].stock_quantity,12);
    assert.equal(latest[0].status,"active");
    assert.deepEqual(latest[1],other,"High-quality existing photo must not change");
    assert.equal(objects.size,1);
    assert.equal(db.attempts.get(product.slug).status,"upgraded");
    const retry=await reconcile(env,Math.floor(Date.now()/1000));
    assert.equal(retry.upgraded,0);
    assert.equal(db.updates.length,1);
  }finally{globalThis.fetch=originalFetch;}
});

test("Sensilis: use only the product zoom gallery image, not unrelated recommendations",()=>{
 const url="https://sensilis.com.ua/upgrade-ampoules/";
 const html='<div class="recommended"><img src="https://sensilis.com.ua/image/catalog/other.png"></div>'+
  '<img src="https://sensilis.com.ua/image/cache/01-thumb.png" title="Upgrade Ampoules" id="zoom" alt="Upgrade Ampoules" data-zoom-image="https://sensilis.com.ua/image/cache/catalog/products/Products/Upgrade/Upgrade-Ampoules/01-750x1000.png"/>';
 assert.equal(officialMainGalleryImage(html,url,"Sensilis"),
  "https://sensilis.com.ua/image/cache/catalog/products/Products/Upgrade/Upgrade-Ampoules/01-750x1000.png");
 assert.equal(officialMainGalleryImage('<img src="https://sensilis.com.ua/image/catalog/other.png">',url,"Sensilis"),null);
 assert.equal(officialMainGalleryImage(html,url,"DÉCAAR"),null);
});
test("Sensilis without OpenGraph: photo imported from its verified main gallery",async()=>{
 const product={id:"sen-1",slug:"supplier-sensilis-upgrade-ampoules",brand:"Sensilis",
  name:"Sensilis Upgrade Ampoules",price:1746,sale_price:null,stock_quantity:0,status:"draft",
  image_url:null};
 const db=fakeDb([product]),objects=new Map();
 const env={SHOP_DB:db.client,SHOP_MEDIA:{
   async put(key,data,meta){objects.set(key,{data,meta});},
   async head(key){return objects.get(key)||null;}
 }};
 const png=fakePng(750,1000);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url)=>{
   if(url==="https://sensilis.com.ua/upgrade-ampoules/")
    return new Response('<h1>Upgrade Ampoules</h1>'+
       '<img src="/image/cache/01-555x740.png" title="Upgrade Ampoules" id="zoom" data-zoom-image="https://sensilis.com.ua/image/cache/catalog/products/Products/Upgrade/Upgrade-Ampoules/01-750x1000.png"/>',
       {headers:{"content-type":"text/html"}});
   if(url==="https://sensilis.com.ua/image/cache/catalog/products/Products/Upgrade/Upgrade-Ampoules/01-750x1000.png")
    return new Response(png,{headers:{"content-type":"image/png"}});
   throw Error("Unexpected supplier URL "+url);
 };
 try {
   const summary=await reconcile(env,Math.floor(Date.now()/1000));
   assert.equal(summary.attached,1);
   assert.equal(summary.failed,0);
   assert.ok(db.read()[0].image_url.startsWith("/shop-media/products/official-auto/"));
   assert.equal(db.read()[0].price,1746);
   assert.equal(db.read()[0].status,"draft");
   assert.equal(objects.size,1);
 }finally{globalThis.fetch=originalFetch;}
});

test("new matcher revision retries old unresolved supplier rows immediately",async()=>{
  const item={id:"sen-retry",slug:"supplier-sensilis-upgrade-ampoules",brand:"Sensilis",
    name:"Sensilis Upgrade Ampoules",image_url:null,status:"draft",price:1000};
  const db=fakeDb([item]), objects=new Map();
  db.attempts.set(item.slug,{status:"unresolved",detail:"No exact supplier image",
    checked_at:Math.floor(Date.now()/1000)});
  const env={SHOP_DB:db.client,SHOP_MEDIA:{
    async put(key,data,meta){objects.set(key,{data,meta});},
    async head(key){return objects.get(key)||null;}
  }};
  const bytes=fakePng(750,1000);
  const prior=globalThis.fetch;
  globalThis.fetch=async url=>{
    if(url==="https://sensilis.com.ua/upgrade-ampoules/")
      return new Response('<h1>Upgrade Ampoules</h1>'+
        '<img id="zoom" data-zoom-image="https://sensilis.com.ua/image/catalog/ampoules.png">',
        {headers:{"Content-Type":"text/html"}});
    if(url==="https://sensilis.com.ua/image/catalog/ampoules.png")
      return new Response(bytes,{headers:{"Content-Type":"image/png"}});
    throw Error("Unexpected URL "+url);
  };
  try {
    const report=await reconcile(env,Math.floor(Date.now()/1000));
    assert.equal(report.attached,1,"Old failure must be retried after matcher update");
    assert.equal(objects.size,1);
    assert.match(db.attempts.get(item.slug).detail,/supplier-gallery-2026-11-17-r3/);
  }finally{globalThis.fetch=prior;}
});

test("official supplier redirects are followed only inside the same allowlisted brand",async()=>{
 const product={id:"sen-redirect",slug:"supplier-sensilis-upgrade-ampoules",brand:"Sensilis",
   name:"Sensilis Upgrade Ampoules",image_url:null,status:"draft",price:1000};
 const db=fakeDb([product]), objects=new Map();
 const env={SHOP_DB:db.client,SHOP_MEDIA:{
   async put(key,data,meta){objects.set(key,{data,meta});},
   async head(key){return objects.get(key)||null;}
 }};
 const bytes=fakePng(750,1000), originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{
   if(url==="https://sensilis.com.ua/upgrade-ampoules/")
     return new Response(null,{status:301,headers:{location:"https://www.sensilis.com.ua/upgrade-ampoules/"}});
   if(url==="https://www.sensilis.com.ua/upgrade-ampoules/")
     return new Response('<h1>Upgrade Ampoules</h1>'+
       '<img id="zoom" data-zoom-image="https://sensilis.com.ua/image/catalog/ampoules.png">',
       {headers:{"Content-Type":"text/html"}});
   if(url==="https://sensilis.com.ua/image/catalog/ampoules.png")
     return new Response(bytes,{headers:{"Content-Type":"image/png"}});
   throw Error("Unexpected URL "+url);
 };
 try{
   const result=await reconcile(env,Math.floor(Date.now()/1000));
   assert.equal(result.attached,1);
   assert.equal(result.failed,0);
   assert.equal(objects.size,1);
 }finally{globalThis.fetch=originalFetch;}
});


test("large missing-photo backlog still leaves room for blurry CU SKIN upgrades",async()=>{
 const missing=Array.from({length:8},(_,i)=>({
   id:"hp-missing-"+i,slug:"hp-unknown-"+i,brand:"HydroPeptide",
   name:"HydroPeptide Unknown Product "+i,image_url:null,status:"draft",price:1000,
 }));
 const cu={id:"cu-tiny",slug:"supplier-cuskin-bifida-barrier-cream",brand:"CU SKIN",
   name:"CU SKIN Dr. Solution Bifida Barrier Cream",image_url:"/shop-media/products/tiny.png",
   status:"active",price:1932,sale_price:1800,stock_quantity:10};
 const db=fakeDb([...missing,cu]),objects=new Map();
 const small=fakePng(90,74),large=fakePng(1000,1000);
 const env={SHOP_DB:db.client,SHOP_MEDIA:{
   async get(key){return key==="products/tiny.png"?{arrayBuffer:async()=>small.buffer}:null;},
   async put(key,data,metadata){objects.set(key,{data,metadata});},
   async head(key){return objects.get(key)||null;}
 }};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{
   if(String(url).includes("hydropeptide.ua/?post_type=product"))
     return new Response("<html><h1>Search</h1></html>",{headers:{"content-type":"text/html"}});
   if(String(url).includes("hydropeptide.com/search"))
     return new Response("<html><h1>Search</h1></html>",{headers:{"content-type":"text/html"}});
   if(String(url).startsWith("https://cu.ua/?s="))
     return new Response('<a href="/product/bifida-barrier-cream/">Product</a>',
       {headers:{"content-type":"text/html"}});
   if(url==="https://cu.ua/product/bifida-barrier-cream/")
     return new Response('<h1>CU SKIN Dr. Solution Bifida Barrier Cream</h1>'+
       '<meta property="og:image" content="https://cu.ua/image/bifida-barrier-cream.png">',
       {headers:{"content-type":"text/html"}});
   if(url==="https://cu.ua/image/bifida-barrier-cream.png")
     return new Response(large,{headers:{"content-type":"image/png"}});
   throw Error("Unexpected network URL "+url);
 };
 try{
   const result=await reconcile(env,Math.floor(Date.now()/1000));
   assert.equal(result.attempted,6);
   assert.equal(result.upgraded,1,"Large missing backlog must not starve CU SKIN quality fixes");
   assert.equal(result.attached,0);
   assert.equal(objects.size,1);
   const product=db.read().find(p=>p.id==="cu-tiny");
   assert.ok(product.image_url.includes("/official-auto/"));
   assert.equal(product.price,1932);
   assert.equal(product.sale_price,1800);
   assert.equal(product.stock_quantity,10);
 }finally{globalThis.fetch=originalFetch;}
});
