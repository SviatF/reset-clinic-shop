#!/usr/bin/env node
/**
 * Mirror only the 53 existing OLIE'RE supplier image URLs already recorded
 * in our product catalog, preserving all product data and source attribution.
 * Saves deduplicated binary assets so the storefront no longer hotlinks Shopify.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const apply=process.argv.includes('--apply');
const rows=JSON.parse(await fs.readFile('data/products.json','utf8'));
const mapFile='data/supplier-photo-map.json';
const entries=JSON.parse(await fs.readFile(mapFile,'utf8'));
const host='cdn.shopify.com';
const allowedPath='/s/files/1/0765/2812/4147/';
const items=rows.filter(p=>p.status==='active' && p.brand==="OLIE'RE PARIS" && p.image_url);
const groups=new Map();
for(const p of items){
 const u=new URL(p.image_url);
 if(u.protocol!=='https:'||u.hostname!==host||!u.pathname.startsWith(allowedPath)){
   throw new Error('Unexpected supplier image URL for '+p.slug+': '+p.image_url);
 }
 const arr=groups.get(p.image_url)||[];
 arr.push(p);groups.set(p.image_url,arr);
}
const mime={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
const report={products:items.length,uniqueImages:groups.size,completed:0,linked:0,failures:[]};
for(const [url,products] of groups){
 const allMapped=products.every(p=>entries[p.slug]?.source_image_url===url && !entries[p.slug]?.image_url?.endsWith('.avif'));
 if(allMapped){report.completed++;report.linked+=products.length;continue}
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),18000);
 try{
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'image/png,image/webp,image/jpeg,image/*;q=.8'},signal:ctl.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const contentType=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
  const ext=mime[contentType];if(!ext)throw Error('Invalid image MIME '+contentType);
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>8_000_000)throw Error('Image too large');
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length<1000||buffer.length>8_000_000)throw Error('Image invalid length');
  const magic=ext==='jpg'?buffer[0]===255&&buffer[1]===216
    :ext==='png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    :ext==='webp'?buffer.toString('ascii',8,12)==='WEBP'
    :buffer.toString('ascii',4,16).includes('ftypavif');
  if(!magic)throw Error('Image signature mismatch');
  const filename=createHash('sha256').update(url).digest('hex').slice(0,20)+'.'+ext;
  const output='public/supplier-photos/oliere/'+filename;
  if(apply){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,buffer)}
  const sha256=createHash('sha256').update(buffer).digest('hex');
  for(const p of products){
   entries[p.slug]={
     image_url:'/'+output.replace(/^public\//,''),
     source_image_url:url,
     supplier:'OLIE\\u0027RE PARIS',
     match_score:1,
     sha256,
   };
  }
  report.completed++;report.linked+=products.length;
  console.log('Mirrored',filename,'for',products.map(x=>x.sku).join(','));
 }catch(error){report.failures.push({image:url,products:products.map(p=>p.slug),reason:String(error)})}
 finally{clearTimeout(timeout)}
}
if(apply)await fs.writeFile(mapFile,JSON.stringify(entries,null,2)+'\n');
await fs.writeFile('supplier-cdn-mirror-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({apply,products:report.products,uniqueImages:report.uniqueImages,completed:report.completed,linked:report.linked,failures:report.failures.length}));
