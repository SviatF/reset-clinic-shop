#!/usr/bin/env node
/** CI guardrail: each official hair SKU has its own source identity; bundles
 * use transparent composites of audited single SKUs, never group-scene masks. */
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
let verified=0,pending=0,composites=0,singlePhotos=0;

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
  composites++;
  if(ref.bundle_composite_revision!=="composite-v1" ||
     ref.image_url!=="/supplier-photos/bundles/"+row.slug+".webp")
    errors.push(row.sku+": missing current transparent bundle composition");
  if(!ref.pre_bundle_image_url?.startsWith("/supplier-photos/"))
    errors.push(row.sku+": old group-cutout reference missing for safe D1 migration");
  const expected=kit.layers.map(layer=>layer.sku);
  if(JSON.stringify(ref.bundle_component_skus)!==JSON.stringify(expected))
    errors.push(row.sku+": bundle contents do not match curated source manifest");
  if(expected.length<2||expected.length>6||new Set(expected).size!==expected.length)
    errors.push(row.sku+": incorrect number of unique products in bundle");
  for(const sku of expected){
    const constituent=bySku.get(sku);
    if(!constituent || constituent.brand!=="OLIE'RE PARIS" ||
       constituent.status!=="active" || bundles.has(sku) ||
       refs[constituent.slug]?.verified_by!=="exact_official_shopify_product_title_and_size")
      errors.push(row.sku+": constituent SKU missing official product verification: "+sku);
  }
  mediaIsGood(row.sku,ref.image_url,ref.bundle_composite_sha256,"bundle composite");
 }else{
  singlePhotos++;
  if(ref.isolation_revision!=="isnet-clean-v2" ||
     ref.image_url!=="/supplier-photos/clean/"+row.slug+".webp")
    errors.push(row.sku+": invalid independent hair product cutout");
  mediaIsGood(row.sku,ref.image_url,ref.isolation_sha256,"single product cutout");
 }
 verified++;
}
if(hair.length!==53||verified!==52||pending!==1||composites!==14||singlePhotos!==38||bundles.size!==14)
 errors.push("Unexpected counts: "+JSON.stringify({hair:hair.length,verified,pending,composites,singlePhotos,manifest:bundles.size}));
console.log(JSON.stringify({hair:hair.length,verified,uniqueOfficialProducts:officialIds.size,composites,singlePhotos,pending,errors:errors.length},null,2));
for(const issue of errors)console.error("OLIERE_IMAGE_AUDIT",issue);
if(errors.length)process.exit(1);
