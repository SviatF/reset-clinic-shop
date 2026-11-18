import assert from "node:assert/strict";
import { planCatalogPublishing, publishCatalogRows } from "../lib/catalog-publishing.ts";
const base = {
 id:"p1",slug:"one",name:"Shampoo",brand:"CU SKIN",sku:"300001",category:"face",
 status:"draft", price:300, sale_price:null, stock_quantity:0, track_stock:true,
 image_url:"/shop-media/products/one.webp", published_at:null, updated_at:"old",
};
const photos = {...base,id:"p2",slug:"two",name:"Histolab cream",brand:"Histolab",sku:null,image_url:null};
const noPrice = {...base,id:"p3",slug:"three",price:0};
const active = {...base,id:"p4",slug:"four",status:"active",published_at:"original"};
const hidden = {...base,id:"hidden",slug:"parsley-seed-anti-oxidant-eye-cream"};
const mapped = {...base,id:"p5",slug:"five",image_url:null};
const raw = [base,photos,noPrice,active,hidden,mapped];
const effective = raw.map(p => p.id === "p5" ? {...p,image_url:"/supplier-photos/verified/five.webp"} : p);
const before=JSON.stringify(raw);
const ids=raw.map(p=>p.id);
const rows=planCatalogPublishing(raw,effective,ids);
assert.equal(rows.filter(r=>r.eligible).length,2);
assert.equal(rows.find(r=>r.id==="p1").zeroStock,true);
assert.equal(rows.find(r=>r.id==="p2").reason,"Немає фотографії товару");
assert.equal(rows.find(r=>r.id==="p3").reason,"Не вказано коректну ціну");
assert.equal(rows.find(r=>r.id==="p4").reason,"Товар не у статусі чернетки");
assert.equal(rows.find(r=>r.id==="hidden").eligible,false);
const result=publishCatalogRows(raw,effective,ids,"now");
assert.equal(result.updatedCount,2);
assert.equal(result.products.find(p=>p.id==="p1").status,"active");
assert.equal(result.products.find(p=>p.id==="p1").stock_quantity,0,"Do not invent inventory");
assert.equal(result.products.find(p=>p.id==="p1").sale_price,null);
assert.equal(result.products.find(p=>p.id==="p5").image_url,"/supplier-photos/verified/five.webp");
assert.equal(result.products.find(p=>p.id==="p1").published_at,"now");
for(const id of ["p2","p3","p4","hidden"])
 assert.deepEqual(result.products.find(p=>p.id===id),raw.find(p=>p.id===id));
assert.equal(JSON.stringify(raw),before,"Publishing must not mutate original D1 snapshot");
console.log("Bulk publish: selected drafts only, photo/price safeguards and untouched stock verified");

const catalogRows=planCatalogPublishing(raw,effective,ids,{allowUnpriced:true});
assert.equal(catalogRows.filter(r=>r.eligible).length,3);
assert.equal(catalogRows.find(r=>r.id==="p3").catalogOnly,true);
const catalogRelease=publishCatalogRows(raw,effective,ids,"today",{allowUnpriced:true});
assert.equal(catalogRelease.updatedCount,3);
assert.equal(catalogRelease.products.find(p=>p.id==="p3").status,"active");
assert.equal(catalogRelease.products.find(p=>p.id==="p3").price,0,"Never invent a retail price");
assert.equal(catalogRelease.products.find(p=>p.id==="p3").stock_quantity,0,"Never invent stock");
assert.equal(JSON.stringify(raw),before,"Original D1 snapshot unchanged by catalog-only publishing");
const badPrice={...noPrice,id:"bad-price",slug:"bad-price",price:-20};
const badPricePlan=planCatalogPublishing([...raw,badPrice],[...effective,badPrice],["bad-price"],{allowUnpriced:true});
assert.equal(badPricePlan[0].eligible,false,"Negative prices are never published");
const badImage={...noPrice,id:"bad-image",slug:"bad-image",image_url:null};
const badImagePlan=planCatalogPublishing([...raw,badImage],[...effective,badImage],["bad-image"],{allowUnpriced:true});
assert.equal(badImagePlan[0].eligible,false,"Missing image remains a hard blocker");
console.log("Catalog-only publication: explicit opt-in, zero payable price and zero stock protected");
