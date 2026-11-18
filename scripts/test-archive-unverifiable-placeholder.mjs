import test from "node:test";
import assert from "node:assert/strict";
import { archiveUnverifiableMascaraPlaceholder } from "../workers/shop-media-sync/archive-unverifiable-placeholder.mjs";
const template={
 id:"source_supplier-sensilis-mascara",
 slug:"supplier-sensilis-mascara",name:"Sensilis Mascara — туш для вій",
 brand:"Sensilis",status:"draft",price:1400,stock_quantity:0,track_stock:true,
 sku:null,size:null,image_url:null,description:"Mascara — туш для вій. Необхідна перевірка."
};
function setup(mascara){
 let rows=[mascara,...Array.from({length:340},(_,i)=>({
  id:"known-"+i,slug:"known-"+i,brand:"HydroPeptide",name:"Known "+i,status:"active",price:300,
  stock_quantity:1,image_url:"/supplier-photos/studio/known-"+i+".webp"
 }))],version=12,changed=0;
 return {
  data:()=>rows,changed:()=>changed,
  SHOP_DB:{prepare(sql){if(sql.startsWith("SELECT"))return{
    async first(){return {content:JSON.stringify(rows),version}}
  };
  if(sql.startsWith("UPDATE"))return{
    bind(next,prior){return{async run(){
      if(prior!==version)return {meta:{changes:0}};
      rows=JSON.parse(next);version++;changed++;return {meta:{changes:1}};
    }}}
  };
  throw Error("Unexpected query "+sql);
  }}
 };
}
test("archives only exact unchanged imported no-SKU placeholder, preserving the rest of D1",async()=>{
 const env=setup({...template});
 const original=structuredClone(env.data());
 const res=await archiveUnverifiableMascaraPlaceholder(env);
 assert.equal(res.archived,1);
 assert.equal(env.data()[0].status,"archived");
 assert.equal(env.data()[0].price,1400);
 assert.equal(env.data()[0].stock_quantity,0);
 assert.ok(env.data()[0].description.includes("немає назви моделі"));
 assert.deepEqual(env.data().slice(1),original.slice(1));
 assert.equal((await archiveUnverifiableMascaraPlaceholder(env)).archived,0);
 assert.equal(env.changed(),1);
});
test("a merchant-edited, real or already published mascara is never archived",async()=>{
 for(const edits of [{sku:"SENSILIS-UNKNOWN"},{image_url:"/shop-media/products/real.png"},{name:"Sensilis Original Mascara"},{status:"active"},{price:1500},{stock_quantity:12}]){
  const env=setup({...template,...edits});
  const res=await archiveUnverifiableMascaraPlaceholder(env);
  assert.equal(res.archived,0,"Unexpectedly archived "+JSON.stringify(edits));
  assert.equal(env.changed(),0);
 }
});
test("one generic product cannot cause another product to be changed",async()=>{
 const env=setup({...template,id:"other"});
 const res=await archiveUnverifiableMascaraPlaceholder(env);
 assert.equal(res.archived,0);
 assert.equal(env.changed(),0);
});
