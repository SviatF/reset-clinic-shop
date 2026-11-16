import assert from "node:assert/strict";
import { cuskinImportPlan, resolveCuskinConflicts } from "../lib/cuskin-import.ts";

function source(sku, name, size="30мл") {
  return {
    sku, slug:"cuskin-"+sku+"-test", name, english_name:name,
    brand:"CU SKIN", category:"face", subcategory_slugs:[], product_line:"",
    price:1000, size, short_description:"", description:"",
    how_to_use:"", inci:"",
  };
}
function existing(id,name,size=null,sku=null) {
  return {
    id, slug:"old-"+id, name, brand:"CU SKIN", sku, size,
    price:1500, sale_price:null, status:"active", category:"face",
    subcategory_slugs:[], product_line:null, image_url:null,
  };
}
function outcome(existingProducts,row) {
  return cuskinImportPlan(existingProducts,[row])[0];
}
// Similar product names with DIFFERENT strength/volume/format/tones are not duplicates.
const different = [
  ["retinol strength",
    existing("retinol03","CU SKIN CLEAN-UP DUAL ACTIVATOR RETINOL 0.3% BAKUCHIOL 0.75%","30мл"),
    source("300240","CU SKIN CLEAN-UP DUAL ACTIVATOR RETINOL 1% BAKUCHIOL 0.75%","30мл")],
  ["niacin concentration and volume",
    existing("niacin10","CU SKIN DR. SOLUTION NIACIN 10% VITAMIN C AMPOULE","50г"),
    source("300237","CU SKIN DR. SOLUTION NIACIN 20% VITAMIN C AMPOULE","30г")],
  ["same product, distinct volume",
    existing("cream7","CU SKIN CLEAN-UP MOISTURE BALANCING CREAM","7мл"),
    source("300131","CU SKIN CLEAN-UP MOISTURE BALANCING CREAM","50мл")],
  ["sachet vs regular packaging",
    existing("powder","CU SKIN CU DR.SOLUTION B6 ENZYME POWDER WASH SACHET","1г*20шт"),
    source("300246","CU SKIN CU DR.SOLUTION B6 ENZYME POWDER WASH","55г")],
  ["sachet word means different packaging even when existing size unknown",
    existing("powdersachet","CU SKIN CU DR.SOLUTION B6 ENZYME POWDER WASH SACHET"),
    source("300246","CU SKIN CU DR.SOLUTION B6 ENZYME POWDER WASH","55г")],
  ["bb vs cc cream",
    existing("cc","CU SKIN VITAMIN U CC CREAM","45мл"),
    source("300152","CU SKIN VITAMIN U BB CREAM","45мл")],
  ["cushion shade",
    existing("shade21","CU SKIN VITAMIN U CUSHION №21","15г"),
    source("300283","CU SKIN VITAMIN U CUSHION №23","15г")],
  ["face vs eye use",
    existing("retinolface","CU SKIN CLEAN-UP RETINOL ACTIVATOR 0.1%","15мл"),
    source("300163","CU SKIN CLEAN-UP RETINOL ACTIVATOR FOR EYE 0.1%","15мл")],
  ["spf 28 vs spf 40",
    existing("spf28","CU SKIN VITAMIN U BB CREAM SPF28","45мл"),
    source("300153","CU SKIN VITAMIN U BB CREAM SPF40","45мл")],
  ["sun serum vs regular serum",
    existing("sunserum","CU SKIN VITAMIN U SUN SERUM SPF 50+ PA++++"),
    source("300123","CU SKIN VITAMIN U SERUM","60мл")],
  ["cream vs ampoule in same product family",
    existing("ampoule","CU SKIN DR. SOLUTION PDRN BAKUCHIOL AMPOULE 100","50мл"),
    source("300244","CU SKIN DR. SOLUTION PDRN BAKUCHIOL CREAM 100","50мл")],
  ["ml and grams must not compare as equal",
    existing("gram","CU SKIN VITAMIN U CREAM","50г"),
    source("300134","CU SKIN VITAMIN U CREAM","50мл")],
  ["general collection words DR SOLUTION must not match unrelated product",
    existing("acb6","CU SKIN CU DR. SOLUTION AC SOLUTION B6"),
    source("300229","CU SKIN DR.SOLUTION PAPAYA PEELING GEL","100мл")],
  ["general collection words DR SOLUTION vs serum",
    existing("acb6","CU SKIN CU DR. SOLUTION AC SOLUTION B6"),
    source("300281","CU SKIN CU DR.SOLUTION AZELAIC ACID 10% SERUM","30мл")],
  ["vanishing vs purifying foam",
    existing("purifying","CU SKIN CLEAN-UP AV FREE PURIFYING FOAM CLEANSER"),
    source("300267","CU SKIN CLEAN-UP AV FREE VANISHING FOAM CLEANSER","150г")],
];
for(const [label,older,fromSupplier] of different) {
  const planned=outcome([older],fromSupplier);
  assert.equal(planned.kind,"create",String(label)+" must be new: "+planned.reason);
}

// Identical descriptions but an UNKNOWN volume are NOT safe for automatic merging.
const unidentified=existing("missingSize","CU SKIN VITAMIN U AMPOULE TONER",null);
const toner=source("300105","CU SKIN VITAMIN U AMPOULE TONER","130мл");
const review=outcome([unidentified],toner);
assert.equal(review.kind,"conflict");
assert.equal(review.candidates?.[0]?.id,"missingSize");
assert.match(review.reason,/об'єм/);
const confirmed=resolveCuskinConflicts([unidentified],[toner],[review],[
  {sku:toner.sku,kind:"link",existingId:"missingSize"},
]);
assert.equal(confirmed[0].kind,"enrich","Unknown size requires manual verification");
const separate=resolveCuskinConflicts([unidentified],[toner],[review],[
  {sku:toner.sku,kind:"create",confirmDistinct:true},
]);
assert.equal(separate[0].kind,"create","Distinct volume can be preserved after explicit verification");

// If a product already has BOTH the exact title and confirmed volume, a new
// duplicate cannot be introduced through the review-create endpoint.
const withSize=existing("correct","CU SKIN VITAMIN U AMPOULE TONER","130мл","CU-SKIN-005");
const auto=outcome([withSize],toner);
assert.equal(auto.kind,"enrich");
assert.throws(()=>resolveCuskinConflicts([withSize],[toner],
 [{...auto,kind:"conflict",candidates:[{id:"correct",name:withSize.name,sku:withSize.sku,size:withSize.size,price:1500,hasPhoto:false}]}],
 [{sku:toner.sku,kind:"create",confirmDistinct:true}]),/Повний збіг/);

// A known mismatch must never be manually linked.
const strongRow=source("300240","CU SKIN CLEAN-UP DUAL ACTIVATOR RETINOL 1% BAKUCHIOL 0.75%","30мл");
const existingRetinol=existing("0.3","CU SKIN CLEAN-UP DUAL ACTIVATOR RETINOL 0.3% BAKUCHIOL 0.75%","30мл");
assert.throws(()=>resolveCuskinConflicts([existingRetinol],[strongRow],
 [{sku:strongRow.sku,name:strongRow.name,existingId:null,kind:"conflict",reason:"review",needsPhoto:false,
 candidates:[{id:"0.3",name:existingRetinol.name,sku:null,size:"30мл",price:1500,hasPhoto:false}]}],
 [{sku:strongRow.sku,kind:"link",existingId:"0.3"}]),/Неможливо/);

// When two source rows could map to the same stored product,
// neither should be silently merged into that record.
const placeholder=existing("one","CU SKIN VITAMIN U AMPOULE TONER","130мл");
const twoSource=[toner,source("300106","CU SKIN VITAMIN U AMPOULE TONER","130мл")];
const ambiguousPair=cuskinImportPlan([placeholder],twoSource);
assert.equal(ambiguousPair.filter(x=>x.kind==="conflict").length,2);
console.log("CU SKIN variant identity: concentration, size, shade, formulas, pack and SKU safeguards passed");
