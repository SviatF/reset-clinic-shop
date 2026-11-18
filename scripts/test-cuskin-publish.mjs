import test from "node:test";
import assert from "node:assert/strict";
import {eligibleForCatalogRelease,releaseOfficialCUListings} from "../workers/shop-media-sync/catalog-release.mjs";

const row=(suffix)=>({
 id:"cu-official-"+suffix,slug:"cu-skin-official-"+suffix,sku:"300"+suffix,
 brand:"CU SKIN",status:"draft",price:0,stock_quantity:0,track_stock:true,
 image_url:"/shop-media/products/cu-skin-official/"+suffix+"-good.png",
 updated_at:"2026-11-17T00:00:00Z",published_at:null
});
function fakeDB(input){
 let products=structuredClone(input),version=15;
 return {
  read:()=>products,
  SHOP_DB:{prepare(sql){return {
   async first(){assert.ok(sql.startsWith("SELECT"));return {content:JSON.stringify(products),version}},
   bind(data,expected){return {async run(){
    assert.ok(sql.startsWith("UPDATE"));
    if(expected!==version)return {meta:{changes:0}};
    products=JSON.parse(data);version++;
    return {meta:{changes:1}};
   }}}
  }}}
 };
}
test("release exactly the 25 verified official draft products; leave prices and inventory alone",async()=>{
 const fromSnapshot=["223","238","103","107","109","111","112","115","119","122","143","145","160","241","199","200","201","202","226","228","137","193","196","197","198"];
 const drafts=fromSnapshot.map(row);
 const keep={
   ...row("140"),id:"merchant-existing",slug:"existing",status:"draft",price:0,
   image_url:"/shop-media/products/cu-skin-official/140-good.png"
 };
 const other={...row("140"),id:"hydro-test",brand:"HydroPeptide",price:100};
 const active={...row("150"),status:"active",price:200,published_at:"old"};
 const db=fakeDB([...drafts,keep,other,active,...Array.from({length:335},(_,i)=>({id:"a"+i,brand:"DÉCAAR",status:"active"}))]);
 const result=await releaseOfficialCUListings(db);
 assert.equal(result.published,25);
 for(const p of drafts){
  const live=db.read().find(x=>x.id===p.id);
  assert.equal(live.status,"active");
  assert.equal(live.price,0);
  assert.equal(live.stock_quantity,0);
  assert.equal(live.track_stock,true);
  assert.equal(live.image_url,p.image_url);
  assert.ok(live.published_at);
 }
 assert.equal(db.read().find(x=>x.id===keep.id).status,"draft");
 assert.equal(db.read().find(x=>x.id===other.id).status,"draft");
 assert.equal(db.read().find(x=>x.id===active.id).published_at,"old");
 assert.equal((await releaseOfficialCUListings(db)).published,0);
});
test("unsafe exact SKU with wrong image does not release",()=>{
 assert.equal(eligibleForCatalogRelease({...row("223"),image_url:"/shop-media/products/cu-skin-official/238-photo.png"}),false);
 assert.equal(eligibleForCatalogRelease({...row("223"),id:"random-223"}),false);
 assert.equal(eligibleForCatalogRelease({...row("223"),brand:"DÉCAAR"}),false);
 assert.equal(eligibleForCatalogRelease({...row("223"),sku:"300999"}),false);
 assert.equal(eligibleForCatalogRelease({...row("223"),status:"active"}),false);
});
