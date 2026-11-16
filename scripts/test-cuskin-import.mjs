import assert from "node:assert/strict";
import { validateCuskinRows, cuskinImportPlan, applyCuskinImport } from "../lib/cuskin-import.ts";

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
console.log("CU SKIN catalog import validation, deduplication, preservation and photo safety passed");
