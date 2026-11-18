#!/usr/bin/env node
/** CI guardrail: 14 OLIE\u0027RE kits retain untouched original supplier photos;
 * 38 standalone items retain independently cleaned, transparent packshots. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const rows=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const refs=JSON.parse(fs.readFileSync("data/supplier-photo-map.json","utf8"));
const manifest=JSON.parse(fs.readFileSync("data/oliere-bundle-compositions.json","utf8"));
const bundles=new Map(manifest.sets.map(spec=>[spec.sku,spec]));
const bySku=new Map(rows.map(row=>[row.sku,row]));
const hair=rows.filter(p=>p.status==="active"&&p.brand==="OLIE'RE PARIS");
const officialIds=new Set(),errors=[];
let verified=0,pending=0,originalKits=0,singlePhotos=0,recovered=0;

function mediaIsGood(sku,uri,checksum,description){
 if(!uri?.startsWith("/supplier-photos/")){errors.push(sku+": invalid "+description+" URL");return}
 const disk=path.join("public",uri);
 if(!fs.existsSync(disk)||fs.statSync(disk).size<800){errors.push(sku+": missing "+description);return}
 const bytes=fs.readFileSync(disk);
 if(createHash("sha256").update(bytes).digest("hex")!==checksum) errors.push(sku+": "+description+" SHA256 mismatch");
 if(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP") errors.push(sku+": "+description+" is not WebP");
}

for(const row of hair){
 const ref=refs[row.slug];
 if(!ref){errors.push(row.sku+": missing mapped image reference");continue}
 // This unique legacy set was not in the current official Shopify catalog.
 // Restore its photo ONLY after verifying the exact set title on a live retailer
 // product endpoint, and checksum-pin the downloaded unmodified packshot.
 if(row.sku==="OLIERE-021" && ref.verification_status==="matched_exact_product_title"){
  recovered++;
  if(ref.image_url!=="/supplier-photos/oliere/studio-professional-styling-bundle.webp" ||
     ref.verified_supplier_title!=="Професійний набір для укладання волосся Studio OLIE'RE PARIS" ||
     !ref.verified_page?.startsWith("https://pinkygreen.shop/collections/studio/products/profesiynyy-nabir-dlya-ukladannya-volossya-studio-oliere-paris") ||
     !ref.retrieved_image_source?.startsWith("https://cdn.shopify.com/s/files/1/0673/9777/9643/files/"))
    errors.push(row.sku+": recovered exact Studio bundle photo provenance mismatch");
  mediaIsGood(row.sku,ref.image_url,ref.retrieved_sha256,"exact-title Studio bundle photo");
  verified++;
  continue;
 }
 if(ref.verification_status==="needs_review"){
  pending++;
  if(row.sku!=="OLIERE-021"||ref.image_url!==null||!ref.legacy_image_url)
   errors.push(row.sku+": unexpected unverified product or placeholder");
  continue;
 }
 if(ref.verified_by!=="exact_official_shopify_product_title_and_size")
   errors.push(row.sku+": missing exact official identity verification");
 if(!ref.source_product_url?.startsWith("https://oliere.paris/products/"))
   errors.push(row.sku+": missing official product URL");
 if(!ref.source_product_id||officialIds.has(ref.source_product_id))
   errors.push(row.sku+": duplicate or missing official product ID");
 officialIds.add(ref.source_product_id);
 if(!ref.legacy_image_url)errors.push(row.sku+": legacy D1 image provenance missing");
 if(!ref.source_asset_url?.startsWith("/supplier-photos/oliere-exact/") ||
    !fs.existsSync(path.join("public",ref.source_asset_url)))
   errors.push(row.sku+": original verified supplier photo unavailable");

 const kit=bundles.get(row.sku);
 if(kit){
  originalKits++;
  if(ref.bundle_photo_mode!=="original" ||
     ref.image_url!==ref.source_asset_url ||
     ref.bundle_original_photo_url!==ref.source_asset_url)
    errors.push(row.sku+": expected unchanged official original kit photograph");
  if(ref.bundle_composite_revision)
    errors.push(row.sku+": old composite generation must not control active kit photography");
  if(!ref.archived_bundle_composite_url?.startsWith("/supplier-photos/bundles/"))
    errors.push(row.sku+": historical composite URL missing for safe D1 migration");
  if(!Array.isArray(kit.layers)||kit.layers.length<2||kit.layers.length>6)
    errors.push(row.sku+": original set is missing curated kit identification");
  mediaIsGood(row.sku,ref.image_url,ref.sha256,"untouched original supplier photograph");
 }else{
  singlePhotos++;
  if(ref.isolation_revision!=="isnet-clean-v2" ||
     ref.image_url!=="/supplier-photos/clean/"+row.slug+".webp")
    errors.push(row.sku+": invalid independent hair product cutout");
  mediaIsGood(row.sku,ref.image_url,ref.isolation_sha256,"single product cutout");
 }
 verified++;
}
if(hair.length!==53||verified!==53||pending!==0||recovered!==1||originalKits!==14||singlePhotos!==38||bundles.size!==14)
 errors.push("Unexpected counts: "+JSON.stringify({hair:hair.length,verified,pending,recovered,originalKits,singlePhotos,manifest:bundles.size}));
console.log(JSON.stringify({hair:hair.length,verified,uniqueOfficialProducts:officialIds.size,originalKits,singlePhotos,pending,recovered,errors:errors.length},null,2));
for(const issue of errors)console.error("OLIERE_IMAGE_AUDIT",issue);
if(errors.length)process.exit(1);
