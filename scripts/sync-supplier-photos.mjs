#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Fetch only from known source catalogs. Match name and volume; reject ambiguous matches.
const catalogs=[
 ['Dermafirm','https://dermafirmshop.com/collections/all',4,'query'],
 ['Braderm','https://braderm.in.ua/products/',2,'query'],
 ['Histolab','https://histolab.com.ua/syrovatky',2,'query'],
 ['HydroPeptide','https://hydropeptide.ua/shop/',7,'wp'],
 ['Cetaphil','https://avepharm.com.ua/magazyn/brands/cetaphil/',3,'wp'],
 ['Sensilis','https://sensilis.com.ua/katalog/',8,'query'],
 ['DÉCAAR','https://decaar.com.ua/domashnij-dogljad/',5,'query'],
 ['CU SKIN','https://cu.ua/',1,'query'],
];
const apply=process.argv.includes('--apply');
const products=JSON.parse(await fs.readFile('data/products.json','utf8'));
const mapPath='data/supplier-photo-map.json';
const existing=JSON.parse(await fs.readFile(mapPath,'utf8').catch(()=>'{}'));
const mapping={...existing},report={processed:0,attached:0,unmatched:[],errors:[]};
const htmlDecode=s=>String(s||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,x)=>String.fromCodePoint(x[0]==='x'?parseInt(x.slice(1),16):Number(x))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&mdash;|&ndash;/g,'-');
const strip=s=>htmlDecode(String(s||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const norm=s=>strip(s).toLowerCase().replace(/é/g,'e').replace(/³/g,'3').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=s=>[...new Set(norm(s).split(' ').filter(w=>w.length>1 && !['для','та','and','the','with','крем','cream','шкіри','обличчя','з','на','of'].includes(w)))];
const origin=u=>new URL(u).origin;
function safe(url,base){try{const u=new URL(url,base);return u.protocol==='https:' && !u.username && !u.password?u.href:null}catch{return null}}
function attr(tag,key){const r=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')','i'),m=tag.match(r);return htmlDecode(m?.[1]||m?.[2]||'')}
function photo(html,url,expected){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){if(['og:image','twitter:image'].includes(attr(tag,'property')||attr(tag,'name'))){const link=safe(attr(tag,'content'),url);if(link)return link}}
 for(const s of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const obj=JSON.parse(s[1]);const arr=Array.isArray(obj)?obj:obj['@graph']||[obj];for(const row of arr){if(!String(row['@type']).includes('Product'))continue;const pic=Array.isArray(row.image)?row.image[0]:row.image;const img=safe(typeof pic==='string'?pic:pic?.url,url);if(img)return img}}catch{}
 }
 // OpenCart/Sensilis stores frequently omit og:image. Read the product gallery.
 for (const hit of html.matchAll(/<img\b[^>]*>/gi)) {
   const tag=hit[0], alt=attr(tag,'alt');
   if (!alt || !alt.trim() || !expected || match(expected,alt)<.74) continue;
   for (const field of ['data-zoom-image','data-image','data-original','data-src','src']) {
     const result=safe(attr(tag,field),url);
     if (result && /\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(result)) return result;
   }
 }
 // A product-specific gallery link is acceptable only after title verification.
 const gallery=html.match(/<(?:div|section)[^>]*class=["'][^"']*(?:product-image|product-gallery|thumbnails|image-additional)[^"']*["'][^>]*>([\s\S]{0,9000})/i)?.[1]||"";
 for (const hit of gallery.matchAll(/<a\b[^>]*>/gi)) {
   const u=safe(attr(hit[0],'href'),url);
   if (u && /\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(u)) return u;
 }
 return null;
}
async function get(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);try{const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (RESET Clinic retail catalog sync)','Accept':'text/html,application/json'},signal:ctrl.signal});if(!res.ok)throw Error('HTTP '+res.status);return await res.text()}finally{clearTimeout(timer)}}
function match(p,name){
 const pn=p.name.replace(new RegExp('^'+p.brand+'\\s*','i'),'');
 const core=pn.split(/\s[—–]\s/)[0];
 const needle=norm(core),hay=norm(name),all=tokens(pn),other=tokens(name);
 if(!hay||!needle)return 0;
 const travel=/\btravel(?: size)?\b/i;
 if(travel.test(p.name)!==travel.test(name))return 0;
 const size=String(p.size||'').match(/\d{2,4}/)?.[0];const sourceSize=name.match(/\b(\d{2,4})\s*(?:ml|мл|г|g)\b/i)?.[1];if(size&&sourceSize&&size!==sourceSize)return 0;
 const common=all.filter(t=>other.includes(t)).length;
 const coverage=common/Math.max(all.length,1);
 let s=.64*coverage+.36*(2*common/Math.max(all.length+other.length,1));
 if(needle.length>12&&hay.includes(needle))s=Math.max(s,.94);
 if(p.brand==='Dermafirm'){
   const aliases={'DERMAFIRM-004':'Peptology Boosting Ampoule Niacinamide Vita+','DERMAFIRM-005':'Peptology Boosting Ampoule PDRN'};
   const alias=aliases[p.sku]||p.slug.replace(/^dermafirm-/,'').replace(/-\d+$/,'').replace(/-/g,' ');
   if(norm(alias).length>=12 && hay.includes(norm(alias)))s=Math.max(s,.94);
 }
 if(p.brand==='Cetaphil'&&common<4)s=0;
 return s;
}
function links(html,url){const out=[];for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
 const href=safe(attr(m[1],'href'),url);if(!href||origin(href)!==origin(url)||href===url)continue;
 let label=strip(m[2]);if(label.length<4 || label.length>180){const i=m[2].match(/<img\b[^>]*>/i);label=i?attr(i[0],'alt'):label}
 if(label.length>=4&&label.length<180)out.push({href,label});
 }return out}
async function index(brand,base,n,mode){
 const candidates=new Map();const urls=[base];for(let i=2;i<=n;i++){if(mode==='wp')urls.push(new URL('page/'+i+'/',base).href);else{const u=new URL(base);u.searchParams.set('page',i);urls.push(u.href)}}
 await Promise.all(urls.map(async url=>{try{const page=await get(url);for(const link of links(page,url)){const prev=candidates.get(link.href);if(!prev||prev.label.length<link.label.length)candidates.set(link.href,link)}}catch(e){report.errors.push({brand,url,error:String(e)})}}));
 // Official Shopify listing provides product-model names and exact media.
 if(brand==='Dermafirm'){
   try{
     const catalog=JSON.parse(await get('https://dermafirmshop.com/products.json?limit=250'));
     for(const p of catalog.products||[]){
       const href=safe('https://dermafirmshop.com/products/'+p.handle,base);
       const image=safe(p.images?.[0]?.src||p.image?.src,base);
       if(href&&image)candidates.set(href,{href,label:strip(p.title),image});
     }
   }catch(e){report.errors.push({brand,url:'shopify-products-json',error:String(e)})}
 }
 // Public WooCommerce Store API supplies explicit per-product names and images.
 if(['HydroPeptide','Cetaphil','DÉCAAR'].includes(brand))for(let i=1;i<=2;i++){
  try{const data=JSON.parse(await get(origin(base)+'/wp-json/wc/store/v1/products?per_page=100&page='+i));if(!Array.isArray(data))break;
  for(const item of data){const href=safe(item.permalink,base),image=safe(item.images?.[0]?.src,base);if(href&&image)candidates.set(href,{href,label:strip(item.name),image})}if(data.length<100)break;
  }catch{break}
 }
 return [...candidates.values()];
}
async function imageBytes(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);try{
 const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Referer':origin(url)+'/'},signal:ctrl.signal});if(!res.ok)throw Error('Image HTTP '+res.status);
 const type=(res.headers.get('content-type')||'').split(';')[0].toLowerCase();const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'})[type];if(!ext)throw Error('Not an image: '+type);
 if(Number(res.headers.get('content-length')||0)>5_000_000)throw Error('Image > 5MB');const buffer=Buffer.from(await res.arrayBuffer());if(buffer.length<1000||buffer.length>5_000_000)throw Error('Invalid image length');
 return {buffer,ext};
 }finally{clearTimeout(timer)}}

/** Exact official product detail URLs confirmed by catalog verification.
 * The page heading and image are still verified; this is not blind photo assignment. */
const verifiedProductPages={
 'cetaphil-catalog-003':'https://avepharm.com.ua/product/cetaphil-pro-redness-control-ochishchuvalna-pinka-dlya-chutlivoji-shkiri-oblichchya-shilnoji-do-pochervonin-236-ml/',
 'cetaphil-catalog-004':'https://avepharm.com.ua/product/cetaphil-pro-itch-control-zvolozhuvalniy-losyon-proti-sverbinnya-dlya-atopichnoji-suhoji-ta-chutlivoji-shkiri-236-ml/',
 'cetaphil-catalog-007':'https://avepharm.com.ua/product/cetaphil-nichniy-zvolozhuvalniy-krem-dlya-normalnoji-chutlivoji-ta-duzhe-suhoji-shkiri-oblichchya-48-g/',
 'cetaphil-catalog-008':'https://avepharm.com.ua/product/cetaphil-nizhniy-gel-eksfoliant-dlya-ochishchennya-suhoji-masnoji-ta-kombinovanoji-shkiri-oblichchya-178-ml/',
 'cetaphil-catalog-009':'https://avepharm.com.ua/product/cetaphil-zvolozhuvalniy-balzam-dlya-suhoji-normalnoji-ta-chutlivoji-shkiri-oblichchya-i-tila-500-ml/',
 'cetaphil-catalog-010':'https://avepharm.com.ua/product/cetaphil-zvolozhuvalniy-balzam-dlya-suhoji-normalnoji-ta-chutlivoji-shkiri-oblichchya-i-tila-236-ml/',
 'cetaphil-catalog-011':'https://avepharm.com.ua/product/cetaphil-micelyarna-emulsiya-dlya-ochishchennya-normalnoji-suhoji-ta-chutlivoji-shkiri-236-ml/',
 'sensilis-catalog-002':'https://sensilis.com.ua/azelaic-peel/'
};

for(const [brand,base,pages,mode] of catalogs){
 const target=products.filter(p=>p.brand===brand && p.status==='active' && !p.image_url && !mapping[p.slug]?.image_url);
 if(!target.length)continue;const available=await index(brand,base,pages,mode);console.log(brand,'source entries',available.length,'products',target.length);
 for(const p of target){report.processed++;
 const exactUrl=verifiedProductPages[p.slug];
 let exact=null;
 if(exactUrl && origin(exactUrl)===origin(base)){
   try {
     const verifiedHtml=await get(exactUrl);
     const verifiedTitle=strip(verifiedHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
     const confidence=match(p,verifiedTitle);
     if(confidence>=.74) exact={href:exactUrl,label:verifiedTitle,confidence,image:photo(verifiedHtml,exactUrl,p)};
     else report.errors.push({brand,url:exactUrl,error:'Verified URL title did not match SKU: '+p.sku});
   } catch(error) {report.errors.push({brand,url:exactUrl,error:String(error)})}
 }
 const ranked=available.map(x=>({...x,confidence:match(p,x.label)})).filter(x=>x.confidence>=.78).sort((x,y)=>y.confidence-x.confidence);
 if(!exact && (!ranked.length || (ranked.length>1&&ranked[0].confidence-ranked[1].confidence<.06 &&
     new URL(ranked[0].href).pathname.replace(/\/$/,'')!==new URL(ranked[1].href).pathname.replace(/\/$/,'')))) {report.unmatched.push({slug:p.slug,brand,reason:'Ambiguous or absent product name'});continue}
 const candidate=exact||ranked[0];try{
 const page=candidate.image?null:await get(candidate.href);const h1=page?strip(page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]):candidate.label;
 if(match(p,h1||candidate.label)<.78 && !(brand==='DÉCAAR' && candidate.confidence>=.78 && /^\/d\d+\//.test(new URL(candidate.href).pathname)))throw Error('Product page title mismatch: '+candidate.href+' | '+h1);const remote=candidate.image||photo(page,candidate.href,p);if(!remote)throw Error('No product image: '+candidate.href+' | '+(page?.match(/<img\\b[^>]*>/i)?.[0]||'').slice(0,300));const {buffer,ext}=await imageBytes(remote);
 const filename='public/supplier-photos/'+norm(brand).replace(/\s/g,'-')+'/'+p.slug+'.'+ext;
 if(apply){await fs.mkdir(path.dirname(filename),{recursive:true});await fs.writeFile(filename,buffer)}
 mapping[p.slug]={image_url:'/'+filename.replace(/^public\//,''),source_product_url:candidate.href,source_image_url:remote,match_score:+candidate.confidence.toFixed(3),sha256:crypto.createHash('sha256').update(buffer).digest('hex')};
 report.attached++;console.log('PHOTO',p.sku,filename);
 }catch(e){report.unmatched.push({slug:p.slug,brand,reason:String(e)})}
 }
}
if(apply)await fs.writeFile(mapPath,JSON.stringify(mapping,null,2)+'\n');
await fs.writeFile('supplier-photo-sync-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({apply,processed:report.processed,attached:report.attached,unmatched:report.unmatched.length,errors:report.errors.length}));
