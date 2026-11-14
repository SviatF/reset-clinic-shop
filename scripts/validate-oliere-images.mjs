#!/usr/bin/env node
/** Guardrail: never silently reintroduce shared/mismatched hair photos. */
import fs from "node:fs";
import path from "node:path";
const rows=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const refs=JSON.parse(fs.readFileSync("data/supplier-photo-map.json","utf8"));
const hair=rows.filter(p=>p.status==="active"&&p.brand==="OLIE'RE PARIS");
let verified=0,pending=0;const ids=new Set(),issues=[];
for(const row of hair){
 const ref=refs[row.slug];
 if(!ref){issues.push(row.sku+": no mapped photo reference");continue}
 if(ref.verification_status==="needs_review"){
  pending++;
  if(ref.image_url!==null)issues.push(row.sku+": pending review has nonempty photo");
  if(!ref.legacy_image_url)issues.push(row.sku+": review lacks legacy image provenance");
  continue;
 }
 if(ref.verified_by!=="exact_official_shopify_product_title_and_size"){
  issues.push(row.sku+": image is not verified by exact official product title");
  continue;
 }
 if(!ref.source_product_url?.startsWith("https://oliere.paris/products/")){
  issues.push(row.sku+": invalid official product source URL");
 }
 if(!ref.source_product_id||ids.has(ref.source_product_id)){
  issues.push(row.sku+": missing or duplicate official Shopify product ID");
 }
 ids.add(ref.source_product_id);
 if(ref.image_url!=="/supplier-photos/studio/"+row.slug+".webp"){
  issues.push(row.sku+": unexpected local studio image path");
 }else{
  const disk=path.join("public",ref.image_url);
  if(!fs.existsSync(disk)||fs.statSync(disk).size<800){
    issues.push(row.sku+": missing studio image");
  }
 }
 if(!ref.source_asset_url?.startsWith("/supplier-photos/oliere-exact/")){
  issues.push(row.sku+": missing exact raw official product image");
 }else{
  const raw=path.join("public",ref.source_asset_url);
  if(!fs.existsSync(raw)||fs.statSync(raw).size<800)issues.push(row.sku+": raw verified image missing");
 }
 if(!ref.legacy_image_url)issues.push(row.sku+": missing legacy image provenance");
 verified++;
}
if(hair.length!==53||verified!==52||pending!==1){
 issues.push("Expected 53 hair records: 52 verified exact, 1 awaiting official media review. Got "+JSON.stringify({active:hair.length,verified,pending}));
}
console.log(JSON.stringify({hair:hair.length,verified,uniqueOfficialProducts:ids.size,pending,errors:issues.length},null,2));
if(issues.length){for(const issue of issues)console.error("OLIERE_IMAGE_AUDIT",issue);process.exit(1)}
