import test from "node:test";
import assert from "node:assert/strict";
import {backfillLocalRows,backfillVerifiedLocalMedia} from "../workers/shop-media-sync/local-media-backfill.mjs";
const photo="/supplier-photos/studio/histolab-catalog-001.webp";
const product={id:"h1",slug:"histolab-catalog-001",brand:"Histolab",status:"active",
  name:"Histolab FERULIC",price:2400,stock_quantity:4,image_url:null,updated_at:"old"};
const map={"histolab-catalog-001":{image_url:photo},
 "histolab-catalog-002":{image_url:"/supplier-photos/studio/histolab-catalog-002.webp",verification_status:"needs_review"},
 "bad":{image_url:"https://example.com/photo.jpg"}};
test("fill precisely matched local product photo without modifying price, stock or status",()=>{
 const result=backfillLocalRows([product,{...product,id:"h2",slug:"histolab-catalog-002"}],map);
 assert.equal(result.updated,1);
 assert.equal(result.products[0].image_url,photo);
 assert.equal(result.products[0].price,2400);
 assert.equal(result.products[0].stock_quantity,4);
 assert.equal(result.products[0].status,"active");
 assert.equal(result.products[1].image_url,null);
});
test("never overwrite a merchant photo or set an unverified external URL",()=>{
 const custom={...product,image_url:"/shop-media/products/merchant-custom.png"};
 const result=backfillLocalRows([custom,{...product,slug:"bad"}],map);
 assert.equal(result.updated,0);
 assert.equal(result.products[0].image_url,custom.image_url);
 assert.equal(result.products[1].image_url,null);
});
test("persist missing verified media paths once using versioned D1 CAS",async()=>{
 let data=[product,...Array.from({length:350},(_,i)=>({id:"other"+i,brand:"DÉCAAR",slug:"other"+i,status:"active",image_url:null}))];
 let version=2,updates=0;
 const env={SHOP_DB:{prepare(sql){return{
  async first(){return {content:JSON.stringify(data),version}},
  bind(next,currentVersion){return{async run(){
   assert.equal(currentVersion,version);
   data=JSON.parse(next);version++;updates++;
   return {meta:{changes:1}};
  }}},
 }}}};
 const first=await backfillVerifiedLocalMedia(env);
 assert.equal(first.updated,1);
 assert.equal(data[0].image_url,photo);
 assert.equal((await backfillVerifiedLocalMedia(env)).updated,0);
 assert.equal(updates,1);
});
