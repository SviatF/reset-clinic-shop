#!/usr/bin/env node
/**
 * Sync OLIE'RE PARIS images from their own official Ukrainian Shopify product
 * records, not the old manually guessed CDN URLs. A match is valid ONLY when
 * the complete product title, including product type and package size, is the
 * same after normalizing quotes, accent marks, and typography.
 *
 * Dry run: node scripts/sync-oliere-exact-photos.mjs
 * Apply:   node scripts/sync-oliere-exact-photos.mjs --apply
 * The --apply mode is atomic for catalog mapping: it does not write the JSON
 * mapping until all products and images have been verified and downloaded.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const mapPath = "data/supplier-photo-map.json";
const reportPath = "oliere-exact-photo-report.json";
const SOURCE = "https://oliere.paris";
const sourceHost = "cdn.shopify.com";
const productRows = JSON.parse(await fs.readFile("data/products.json","utf8"));
const currentMap = JSON.parse(await fs.readFile(mapPath,"utf8"));
const hair = productRows.filter(row => row.status === "active" && row.brand === "OLIE'RE PARIS");
const report = { source: SOURCE, mode: APPLY ? "apply" : "audit", total: hair.length,
  matched: [], ambiguous: [], missing: [], failures: [], ignoredSource: [] };

function canonical(value) {
  return String(value ?? "").normalize("NFKD")
    .replace(/\p{M}/gu,"").toLocaleLowerCase("uk")
    .replace(/[’'‘ʼˈ\`]/g, "")
    .replace(/\boliere paris\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .replace(/\s+/g," ").trim();
}

function textSimilarity(a,b) {
  const x=new Set(canonical(a).split(" ").filter(Boolean));
  const y=new Set(canonical(b).split(" ").filter(Boolean));
  if(!x.size||!y.size)return 0;
  const common=[...x].filter(w=>y.has(w)).length;
  return +(2*common/(x.size+y.size)).toFixed(2);
}
async function jsonFetch(url) {
  const controller = new AbortController(), timeout=setTimeout(()=>controller.abort(),25000);
  try {
    const response=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; RESETClinicProductPhotoSync/1.0)","Accept":"application/json"},signal:controller.signal});
    if(!response.ok)throw Error("Official catalogue HTTP "+response.status);
    const body=await response.json();
    if(!Array.isArray(body.products))throw Error("Official catalogue did not return Shopify products");
    return body.products;
  }finally{clearTimeout(timeout)}
}
const shopify = await jsonFetch(SOURCE+"/products.json?limit=250");

// One exact product still exists on the official website, but was omitted from
// Shopify's public /products.json listing. Retrieve its own product JSON by
// verified exact handle, never substitute a similar Studio product instead.
const individuallyVerified = [
  "profesiynyy-nabor-dlya-ukladannya-volossya-studio-oliere-paris",
];
for(const handle of individuallyVerified) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),22000);
  try {
    const url=SOURCE+"/products/"+handle+".json";
    const response=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"},signal:controller.signal});
    if(!response.ok)throw Error("Official product endpoint "+response.status);
    const payload=await response.json();
    const product=payload.product;
    if(!product || !product.title || !product.images?.length)throw Error("No valid official product JSON");
    if(!shopify.some(item=>item.id===product.id))shopify.push(product);
    console.log("VERIFIED_INDVIDUAL_PRODUCT",product.title,product.handle,product.images.length);
  }catch(error){
    console.warn("Official individual product unavailable:",handle,String(error));
  }finally{clearTimeout(timeout)}
}
const candidates = new Map();
for(const item of shopify) {
 const key=canonical(item.title);
 if(!candidates.has(key))candidates.set(key,[]);
 candidates.get(key).push(item);
}
const confirmed=[];
const selectedIds=new Set();
const OUT_OF_CURRENT_OFFICIAL_FEED = new Set(["profesiinyi-nabir-dlia-ukladannia-volossia-studio-olie-re-paris"]);
for(const row of hair){
 const canonicalName=canonical(row.name);
 const hits=candidates.get(canonicalName)||[];
 const match=hits.length===1?hits[0]:null;
 if(!match){
  const ranked=shopify.map(candidate=>({product: candidate.title,handle:candidate.handle,confidence:textSimilarity(row.name,candidate.title)}))
    .sort((a,b)=>b.confidence-a.confidence).slice(0,3);
  const issue={sku:row.sku,slug:row.slug,name:row.name,reason:hits.length>1?"duplicate_exact_titles":"no_exact_title_match",suggestions:ranked};
  (hits.length>1?report.ambiguous:report.missing).push(issue);
  continue;
 }
 if(!match.images?.length){report.failures.push({slug:row.slug,reason:"no_shopify_product_images"});continue}
 if(!match.handle||!match.id){report.failures.push({slug:row.slug,reason:"no_product_handle_or_id"});continue}
 if(selectedIds.has(match.id)){report.failures.push({slug:row.slug,reason:"one_shopify_record_matched_multiple_skus"});continue}
 selectedIds.add(match.id);
 // Primary image for the matched official PRODUCT RECORD, never another SKU.
 const first=[...match.images].sort((a,b)=>(a.position??999)-(b.position??999))[0];
 const selectedVariant=match.variants?.[0];
 const pinned = selectedVariant?.featured_image;
 const image = pinned && match.images.some(i=>i.id===pinned.id) ? pinned : first;
 const remote=image?.src;
 let imgUrl;try{imgUrl=new URL(remote)}catch{
  report.failures.push({slug:row.slug,reason:"missing_image_url"});continue;
 }
 if(imgUrl.protocol!=="https:"||imgUrl.hostname!==sourceHost||!imgUrl.pathname.startsWith("/s/files/1/0765/2812/4147/")){
  report.failures.push({slug:row.slug,reason:"not_official_product_cdn",remote});continue;
 }
 const sourceProductUrl=SOURCE+"/products/"+encodeURIComponent(match.handle);
 const info={sku:row.sku,slug:row.slug,local_title:row.name,official_title:match.title,
  official_product_id:match.id,official_variant_id:selectedVariant?.id||null,
  source_product_url:sourceProductUrl,source_image_url:remote,
  source_image_id:image.id,old_image_url:row.image_url};
 confirmed.push({row,info});
 report.matched.push(info);
}
report.ignoredSource=shopify.filter(p=>!selectedIds.has(p.id)).map(p=>({title:p.title,handle:p.handle}));
console.log("OLIE'RE exact source match:",JSON.stringify({
 total:report.total,matched:report.matched.length,ambiguous:report.ambiguous.length,
 missing:report.missing.length,failures:report.failures.length,
 ignoredSource:report.ignoredSource.length,extras:report.ignoredSource.map(x=>x.title)
}));
if(report.missing.length)console.log("UNMATCHED:",JSON.stringify(report.missing));
if(report.ambiguous.length)console.log("AMBIGUOUS:",JSON.stringify(report.ambiguous));
if(report.failures.length)console.log("FAILURES:",JSON.stringify(report.failures));
if (!APPLY) {
 await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
 process.exit(0);
}
// Only the historically listed Studio kit is absent from today's Shopify
// product API; never attach another Studio image as a guess.
const unmatchedExpected=report.missing.every(row=>OUT_OF_CURRENT_OFFICIAL_FEED.has(row.slug));
if(!unmatchedExpected||report.ambiguous.length||report.failures.length||confirmed.length + report.missing.length !== hair.length) {
 await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
 throw Error("Aborting: unexpected mismatch in the official product catalog.");
}
const destDir = "public/supplier-photos/oliere-exact";
const pending=[];
const imagesMime = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif","image/gif":"gif"};
async function photoFetch(item) {
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try {
  const url = new URL(item.info.source_image_url);
  // Request a sensible, clear primary image from the exact Shopify product.
  // Request the unmodified official CDN URL: transformation parameters can return HTTP 403.
  const response=await fetch(url.toString(),{
    headers:{"User-Agent":"Mozilla/5.0","Accept":"image/webp,image/png,image/jpeg,image/gif"},
    signal:controller.signal
  });
  if(!response.ok)throw Error("Image download HTTP "+response.status);
  const contentType=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
  const ext=imagesMime[contentType];
  if(!ext)throw Error("Not an image: "+contentType);
  if(Number(response.headers.get("content-length")||0)>12_000_000)throw Error("Image too large");
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<800||bytes.length>12_000_000)throw Error("Bad image length "+bytes.length);
  const magic=ext==="jpg"?(bytes[0]===255&&bytes[1]===216)
    :ext==="png"?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    :ext==="webp"?bytes.toString("ascii",8,12)==="WEBP"
    :ext==="gif"?bytes.toString("ascii",0,4)==="GIF8"
    :bytes.toString("ascii",4,16).includes("ftypavif");
  if(!magic)throw Error("Content is not an image matching its MIME");
  return {...item,bytes,extension:ext,hash:createHash("sha256").update(bytes).digest("hex")};
 } finally {clearTimeout(timeout)}
}
for(const item of confirmed){
 try{
  const done=await photoFetch(item);
  pending.push(done);
  console.log("EXACT PHOTO",item.info.sku,item.info.official_product_id,item.info.official_title,
    done.extension,done.bytes.length);
 }catch(e){report.failures.push({sku:item.info.sku,slug:item.row.slug,reason:String(e)})}
}
if(report.failures.length!==0||pending.length!==confirmed.length){
 await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
 throw Error("Aborting: unable to download confirmed product-specific images; catalog mapping unchanged");
}
const newMap=JSON.parse(JSON.stringify(currentMap));
await fs.mkdir(destDir,{recursive:true});
for(const item of pending){
 const {row,info,bytes,extension,hash}=item;
 const file=destDir+"/"+row.slug+"."+extension;
 await fs.writeFile(file,bytes);
 const old=newMap[row.slug]||{};
 const uri="/"+file.replace(/^public\//,"");
 // Official media can change. Clear previous cutout claims so the manual
 // refresh pipeline regenerates alpha masks from the freshly downloaded file.
 newMap[row.slug]={
  ...old,
  image_url:uri,
  source_asset_url:uri,
  legacy_image_url:row.image_url,
  legacy_studio_image_url:old.image_url||null,
  source_product_url:info.source_product_url,
  source_product_id:info.official_product_id,
  source_variant_id:info.official_variant_id,
  source_image_id:info.source_image_id,
  source_image_url:info.source_image_url,
  supplier:"OLIE'RE PARIS",
  match_score:1,
  verified_by:"exact_official_shopify_product_title_and_size",
  sha256:hash,
 };
 delete newMap[row.slug].isolation_revision;
 delete newMap[row.slug].isolation_sha256;
 delete newMap[row.slug].isolation_foreground_share;
 delete newMap[row.slug].pre_isolation_image_url;
 // Updated supplier media invalidates the prior bundle composite. The manual
 // source-refresh workflow recomposes from exact constituent SKU photos.
 delete newMap[row.slug].bundle_composite_revision;
 delete newMap[row.slug].bundle_composite_sha256;
 delete newMap[row.slug].bundle_component_skus;
 delete newMap[row.slug].bundle_method;
}

for(const unresolved of report.missing){
 // The former catalog photo is unverified. Mark it for review instead of
 // leaving the wrong image silently visible in the storefront.
 const row=hair.find(item=>item.slug===unresolved.slug);
 const old=newMap[unresolved.slug]||{};
 newMap[unresolved.slug]={
  ...old,
  legacy_image_url:row.image_url,
  legacy_studio_image_url:old.image_url||null,
  image_url:null,
  verification_status:"needs_review",
  verified_by:"not_present_in_current_official_shopify_catalog"
 };
}
await fs.writeFile(mapPath,JSON.stringify(newMap,null,2)+"\n");
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
console.log("SUCCESS:",pending.length,"confirmed product photos bound to exact official records,",
 report.missing.length,"unlisted product flagged for manual verification");
