import test from "node:test";
import assert from "node:assert/strict";
import {publishVerifiedSupplierDrafts,mainGallery,variantIsCompatible,verifiedUrl,eligible} from "../workers/shop-media-sync/verified-drafts.mjs";
const known={"supplier-decaar-bb-oxygen-cream-spf-50-bb":{brand:"DÉCAAR",title:"BB Oxygen Cream SPF 50",page:"https://decaar.com.ua/d746/"}};
const slug=Object.keys(known)[0];
const product={
 id:"supplier-decaar-bb-oxygen",slug,name:"DÉCAAR BB Oxygen Cream SPF 50 — BB-крем кисневий з перфтордекаліном",
 brand:"DÉCAAR",sku:null,status:"draft",image_url:null,price:3286,stock_quantity:0,track_stock:true,
 published_at:null,updated_at:"2026-11-15"
};
function png(w,h){const b=new Uint8Array(3500);b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);const put=(o,n)=>{b[o]=n>>>24;b[o+1]=(n>>16)&255;b[o+2]=(n>>8)&255;b[o+3]=n&255};put(16,w);put(20,h);return b}
function envWith(rows){
 let catalog=structuredClone(rows),version=7;
 const attempted=new Map(),images=new Map();
 return {
  items:()=>catalog,images,attempted,
  SHOP_DB:{prepare(sql){
    return {
      async run(){assert.ok(sql.startsWith("CREATE TABLE"));return {meta:{changes:0}}},
      async first(){assert.ok(sql.startsWith("SELECT content"));return {content:JSON.stringify(catalog),version}},
      async all(){assert.ok(sql.startsWith("SELECT slug,status"));return {results:[...attempted.values()]}},
      bind(...args){return {
        async run(){
          if(sql.startsWith("UPDATE shop_documents")){
            if(Number(args[1])!==version)return {meta:{changes:0}};
            catalog=JSON.parse(args[0]);version++;return {meta:{changes:1}};
          }
          if(sql.startsWith("INSERT INTO shop_verified_draft_media")){
            attempted.set(args[0],{slug:args[0],status:args[1],detail:args[2],checked_at:Math.floor(Date.now()/1000)});
            return {meta:{changes:1}};
          }
          throw Error("Unexpected bound SQL: "+sql);
        }
      };
    }
  }}},
  SHOP_MEDIA:{async head(key){return images.get(key)||null},async put(key,data,meta){images.set(key,{data,meta})}},
 };
}
function many(rows){return [...rows,...Array.from({length:330},(_,i)=>({id:"other"+i,slug:"other"+i,brand:"HydroPeptide",name:"Other",status:"active"}))]}
function sourceFetch({spf="50",contentType="image/png",photoWidth=600}={}){
 return async(url)=>{
  const text=String(url);
  if(text==="https://decaar.com.ua/d746/")return new Response(
   '<html><h1>ВВ-крем SPF '+spf+' з перфтордекаліном</h1><meta property="og:image" content="https://decaar.com.ua/image/catalog/verified-bb-cream.png"></html>',
   {status:200,headers:{"content-type":"text/html"}}
  );
  if(text==="https://decaar.com.ua/image/catalog/verified-bb-cream.png")
    return new Response(png(photoWidth,700),{status:200,headers:{"content-type":contentType}});
  throw Error("Unexpected source request "+text);
 };
}
test("gallery selector selects source main product photo, not recommendations",()=>{
 assert.equal(mainGallery('<img src="bad"><img id="zoom" src="thumb.png" data-zoom-image="full.png">',"Sensilis"),"full.png");
 assert.equal(mainGallery('<meta property="og:image" content="https://decaar.com.ua/test.png">',"DÉCAAR"),"https://decaar.com.ua/test.png");
});
test("source whitelist excludes redirects and unrelated hosts; HydroPeptide HTTP image canonicalizes",()=>{
 assert.equal(verifiedUrl("http://bad.example/evil.png","DÉCAAR",true),null);
 assert.equal(verifiedUrl("https://decaar.com.ua/image/p.png","DÉCAAR",true),"https://decaar.com.ua/image/p.png");
 assert.equal(verifiedUrl("http://hydropeptide.com/cdn/shop/image.jpg","HydroPeptide",true),"https://hydropeptide.com/cdn/shop/image.jpg");
 assert.equal(verifiedUrl("https://cdn.shopify.com/path/x.png","Sensilis",true),null);
});
test("variant guard rejects strength/SPF mismatch",()=>{
 assert.equal(variantIsCompatible("BB Oxygen Cream SPF 50","ВВ-крем SPF 30"),false);
 assert.equal(variantIsCompatible("BB Oxygen Cream SPF 50","ВВ-крем SPF 50"),true);
 assert.equal(variantIsCompatible("Retinol 0.3%","Retinol 1%"),false);
});
test("exact curated draft matches, but not another brand or already active row",()=>{
 assert.equal(eligible([product],slug,known[slug])?.id,product.id);
 assert.equal(eligible([{...product,brand:"Sensilis"}],slug,known[slug]),null);
 assert.equal(eligible([{...product,status:"active"}],slug,known[slug]),null);
 assert.equal(eligible([{...product,image_url:"/custom/user.png"}],slug,known[slug]),null);
});
test("verified supplier PNG is saved to R2 and exactly one draft published, preserving price, stock and identity",async()=>{
 const env=envWith(many([product]));
 const original=globalThis.fetch;globalThis.fetch=sourceFetch();
 try{
  const first=await publishVerifiedSupplierDrafts(env,{manifest:known,limit:1});
  assert.equal(first.published,1);
  const p=env.items()[0];
  assert.equal(p.status,"active");assert.equal(p.price,3286);
  assert.equal(p.track_stock,true);assert.equal(p.stock_quantity,0);
  assert.equal(p.id,product.id);assert.equal(p.name,product.name);
  assert.ok(p.image_url.startsWith("/shop-media/products/verified-drafts/"+slug+"-"));
  assert.ok(p.published_at);
  assert.equal(env.images.size,1);
  const second=await publishVerifiedSupplierDrafts(env,{manifest:known,limit:1});
  assert.equal(second.attempted,0);
 }finally{globalThis.fetch=original}
});
test("incorrect SPF in supplier page is never used to publish draft",async()=>{
 const env=envWith(many([product]));
 const original=globalThis.fetch;globalThis.fetch=sourceFetch({spf:"30"});
 try{
  const result=await publishVerifiedSupplierDrafts(env,{manifest:known,limit:1});
  assert.equal(result.error,1);
  assert.equal(env.items()[0].status,"draft");
  assert.equal(env.items()[0].image_url,null);
  assert.equal(env.images.size,0);
 }finally{globalThis.fetch=original}
});
test("small supplier image cannot be used to publish a draft",async()=>{
 const env=envWith(many([product]));
 const original=globalThis.fetch;globalThis.fetch=sourceFetch({photoWidth:80});
 try{
  const result=await publishVerifiedSupplierDrafts(env,{manifest:known,limit:1});
  assert.equal(result.error,1);
  assert.equal(env.items()[0].status,"draft");
  assert.equal(env.images.size,0);
 }finally{globalThis.fetch=original}
});
