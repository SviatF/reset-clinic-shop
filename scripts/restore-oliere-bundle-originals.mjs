#!/usr/bin/env node
/**
 * Use the *unaltered, official supplier photo* for each OLIE'RE kit.
 * These already contain complete product groups, backdrops and real shadows.
 * Do not run background removal or compose partial individual-SKU masks.
 *
 * node scripts/restore-oliere-bundle-originals.mjs --apply
 * node scripts/restore-oliere-bundle-originals.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

const apply=process.argv.includes("--apply");
const check=process.argv.includes("--check");
if(apply===check)throw Error("Choose exactly one: --apply or --check");
const mapFile="data/supplier-photo-map.json";
const records=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const map=JSON.parse(fs.readFileSync(mapFile,"utf8"));
const kitManifest=JSON.parse(fs.readFileSync("data/oliere-bundle-compositions.json","utf8")).sets;
const bySku=new Map(records.map(record=>[record.sku,record]));
const report={bundles:kitManifest.length,verified:0,originals:0,errors:[]};
if(kitManifest.length!==14)throw Error("Expected 14 curated OLIE'RE kits");

for(const kit of kitManifest){
 const row=bySku.get(kit.sku);
 const ref=row&&map[row.slug];
 try{
  if(!row||row.brand!=="OLIE'RE PARIS"||row.status!=="active"||!ref)
   throw Error("Kit SKU is missing or inactive");
  if(ref.verified_by!=="exact_official_shopify_product_title_and_size" ||
     !ref.source_product_url?.startsWith("https://oliere.paris/products/") ||
     !ref.source_product_id)
   throw Error("Kit lacks official, product-specific Shopify provenance");
  const original=ref.source_asset_url;
  if(!original?.startsWith("/supplier-photos/oliere-exact/"))
   throw Error("Local original supplier photo not found in mapping");
  const onDisk=path.join("public",original);
  if(!fs.existsSync(onDisk)||fs.statSync(onDisk).size<800)
   throw Error("Original supplier photo missing or too small");
  const bytes=fs.readFileSync(onDisk);
  const digest=createHash("sha256").update(bytes).digest("hex");
  if(ref.sha256!==digest)
   throw Error("Original supplier photo checksum differs from the verified download");
  const webp=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
  const jpeg=bytes[0]===255&&bytes[1]===216;
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const gif=bytes.toString("ascii",0,4)==="GIF8";
  if(!webp&&!jpeg&&!png&&!gif)throw Error("Unexpected original supplier image format");

  if(apply){
   // Keep history so historical D1 stored image URLs still migrate safely.
   ref.archived_bundle_composite_url??="/supplier-photos/bundles/"+row.slug+".webp";
   ref.bundle_photo_mode="original";
   ref.image_url=original;
   ref.bundle_original_photo_url=original;
   delete ref.bundle_composite_revision;
   delete ref.bundle_composite_sha256;
   delete ref.bundle_component_skus;
   delete ref.bundle_method;
   delete ref.isolation_revision;
   delete ref.isolation_sha256;
   delete ref.isolation_foreground_share;
  }
  if(check && (ref.bundle_photo_mode!=="original" ||
     ref.image_url!==original ||
     ref.bundle_original_photo_url!==original ||
     ref.bundle_composite_revision))
   throw Error("Storefront is not configured to use the untouched original photo");

  report.verified++;
  report.originals++;
  console.log("ORIGINAL_SET_PHOTO",kit.sku,original,bytes.length);
 }catch(err){
  report.errors.push({sku:kit.sku,reason:String(err)});
 }
}
console.log("OLIERE_ORIGINAL_KITS",JSON.stringify(report));
if(report.errors.length||report.verified!==14)process.exit(1);
if(apply)fs.writeFileSync(mapFile,JSON.stringify(map,null,2)+"\n");
