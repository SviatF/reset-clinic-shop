import assert from "node:assert/strict";
import { validateCuskinRows, cuskinImportPlan, resolveCuskinConflicts, applyCuskinImport } from "../lib/cuskin-import.ts";

const row = {
  sku:"300275", slug:"cuskin-300275-vitamin-u-lip-veil-serum",
  name:"CU SKIN VITAMIN U LIP VEIL SERUM", english_name:"VITAMIN U LIP VEIL SERUM",
  brand:"CU SKIN", category:"face", subcategory_slugs:["serums"], product_line:"LIP&HAND",
  price:396, size:"10г", short_description:"Сироватка для губ",
  description:"Догляд за губами", how_to_use:"Нанести на губи", inci:"Water",
};
const validated=validateCuskinRows([row]);
assert.equal(validated.length,1);
assert.throws(()=>validateCuskinRows([row,row]),/повторний артикул/);
assert.throws(()=>validateCuskinRows([{...row,sku:"invalid"}]),/артикул/);
assert.throws(()=>validateCuskinRows([{...row,brand:"other"}]),/іншого бренду/);
assert.throws(()=>validateCuskinRows([{...row,price:0}]),/РРЦ/);
assert.throws(()=>validateCuskinRows([{...row,slug:"../bad"}]),/slug/);

const noProducts=cuskinImportPlan([],validated);
assert.equal(noProducts[0].kind,"create");
assert.equal(noProducts[0].needsPhoto,true);
const withImage=[{...row,image_url:"/shop-media/products/cuskin-image.png"}];
const fresh=applyCuskinImport([],withImage,noProducts,new Date().toISOString());
assert.equal(fresh.created,1);
assert.equal(fresh.enriched,0);
assert.equal(fresh.products[0].status,"draft");
assert.equal(fresh.products[0].stock_quantity,0);
assert.equal(fresh.products[0].track_stock,true);
assert.equal(fresh.products[0].price,396);
assert.equal(fresh.products[0].image_url,"/shop-media/products/cuskin-image.png");
assert.throws(()=>applyCuskinImport([],validated,noProducts,"now"),/Фото/);

const current={...fresh.products[0],image_url:null,sku:"CU-SKIN-001",status:"active",sale_price:350,price:500,
 description:"Вже відредагований опис",stock_quantity:15,track_stock:true};
const mergePlan=cuskinImportPlan([current],validated);
assert.equal(mergePlan[0].kind,"enrich");
assert.equal(mergePlan[0].needsPhoto,true);
const merged=applyCuskinImport([current],withImage,mergePlan,"now");
assert.equal(merged.created,0);
assert.equal(merged.enriched,1);
assert.equal(merged.products[0].image_url,"/shop-media/products/cuskin-image.png");
assert.equal(merged.products[0].sku,row.sku);
assert.equal(merged.products[0].price,500);
assert.equal(merged.products[0].sale_price,350);
assert.equal(merged.products[0].stock_quantity,15);
assert.equal(merged.products[0].description,"Вже відредагований опис");
assert.equal(merged.products[0].status,"active");
assert.equal(current.image_url,null,"original must not be mutated");

const duplicate=cuskinImportPlan(fresh.products,validated);
assert.equal(duplicate[0].kind,"skip");
const conflict=cuskinImportPlan([{...fresh.products[0],name:"Totally unrelated shampoo"}],validated);
assert.equal(conflict[0].kind,"conflict");
const otherSku=cuskinImportPlan([{...fresh.products[0],sku:"300999"}],validated);
assert.equal(otherSku[0].kind,"conflict");

// Review similar names against real D1 candidates, without auto-merging.
const plausibleExisting = { ...current, id:"old-cu", slug:"existing-cu", sku:"CU-SKIN-007",
 name:"CU SKIN VITAMIN U LIP SERUM", size:"10г", image_url:null,
 price:600, sale_price:480, stock_quantity:12, status:"active" };
const ambiguous=cuskinImportPlan([plausibleExisting],validated);
assert.equal(ambiguous[0].kind,"conflict");
assert.equal(ambiguous[0].candidates.length,1);
assert.equal(ambiguous[0].candidates[0].id,"old-cu");
assert.equal(ambiguous[0].candidates[0].hasPhoto,false);
assert.equal(resolveCuskinConflicts([plausibleExisting],validated,ambiguous,[])[0].kind,"conflict");
const linked=resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"link",existingId:"old-cu"}]);
assert.equal(linked[0].kind,"enrich");
assert.equal(linked[0].needsPhoto,true);
const linkedSaved=applyCuskinImport([plausibleExisting],withImage,linked,"now");
assert.equal(linkedSaved.created,0);
assert.equal(linkedSaved.enriched,1);
assert.equal(linkedSaved.products[0].sku,row.sku);
assert.equal(linkedSaved.products[0].image_url,withImage[0].image_url);
assert.equal(linkedSaved.products[0].price,600);
assert.equal(linkedSaved.products[0].sale_price,480);
assert.equal(linkedSaved.products[0].status,"active");
assert.equal(linkedSaved.products[0].stock_quantity,12);
assert.equal(plausibleExisting.sku,"CU-SKIN-007","original catalog must stay unchanged");

// Explicit separate item must be independently acknowledged.
assert.throws(()=>resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"create"}]),/Підтвердьте/);
const separate=resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"create",confirmDistinct:true}]);
assert.equal(separate[0].kind,"create");
const separateSaved=applyCuskinImport([plausibleExisting],withImage,separate,"now");
assert.equal(separateSaved.products.length,2);
assert.equal(separateSaved.created,1);
assert.equal(separateSaved.products[1].status,"draft");
assert.equal(separateSaved.products[1].price,396);
assert.throws(()=>resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"link",existingId:"unknown"}]),/Оберіть/);
assert.throws(()=>resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"link",existingId:"old-cu"},{sku:row.sku,kind:"create"}]),/Повторний/);
const otherRealSku={...plausibleExisting,sku:"300999"};
const realConflict=cuskinImportPlan([otherRealSku],validated);
assert.throws(()=>resolveCuskinConflicts([otherRealSku],validated,realConflict,
 [{sku:row.sku,kind:"link",existingId:"old-cu"}]),/справжній артикул/);
assert.throws(()=>resolveCuskinConflicts(fresh.products,validated,
 cuskinImportPlan(fresh.products,validated),[{sku:row.sku,kind:"create",confirmDistinct:true}]),
 /підтвердження/);
assert.throws(()=>resolveCuskinConflicts([plausibleExisting],validated,ambiguous,
 [{sku:row.sku,kind:"create",confirmDistinct:true}, {sku:"300777",kind:"create",confirmDistinct:true}]),
 /Не знайдено товар/);

console.log("CU SKIN catalog import validation, deduplication, preservation and photo safety passed");
