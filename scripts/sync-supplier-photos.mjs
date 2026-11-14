#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Fetch only from known source catalogs. Match name and volume; reject ambiguous matches.
const catalogs=[
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
function photo(html,url){for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){if(['og:image','twitter:image'].includes(attr(tag,'property')||attr(tag,'name'))){const link=safe(attr(tag,'content'),url);if(link)return link}}
 for(const s of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const obj=JSON.parse(s[1]);const arr=Array.isArray(obj)?obj:obj['@graph']||[obj];for(const row of arr){if(!String(row['@type']).includes('Product'))continue;const pic=Array.isArray(row.image)?row.image[0]:row.image;const img=safe(typeof pic==='string'?pic:pic?.url,url);if(img)return img}}catch{}
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
for(const [brand,base,pages,mode] of catalogs){
 const target=products.filter(p=>p.brand===brand && p.status==='active' && !p.image_url && !mapping[p.slug]?.image_url);
 if(!target.length)continue;const available=await index(brand,base,pages,mode);console.log(brand,'source entries',available.length,'products',target.length);
 for(const p of target){report.processed++;const ranked=available.map(x=>({...x,confidence:match(p,x.label)})).filter(x=>x.confidence>=.78).sort((x,y)=>y.confidence-x.confidence);
 if(!ranked.length || (ranked.length>1&&ranked[0].confidence-ranked[1].confidence<.06)) {report.unmatched.push({slug:p.slug,brand,reason:'Ambiguous or absent product name'});continue}
 const candidate=ranked[0];try{
 const page=candidate.image?null:await get(candidate.href);const h1=page?strip(page.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]):candidate.label;
 if(match(p,h1||candidate.label)<.78)throw Error('Product page title mismatch');const remote=candidate.image||photo(page,candidate.href);if(!remote)throw Error('No product image');const {buffer,ext}=await imageBytes(remote);
 const filename='public/supplier-photos/'+norm(brand).replace(/\s/g,'-')+'/'+p.slug+'.'+ext;
 if(apply){await fs.mkdir(path.dirname(filename),{recursive:true});await fs.writeFile(filename,buffer)}
 mapping[p.slug]={image_url:'/'+filename.replace(/^public\//,''),source_product_url:candidate.href,source_image_url:remote,match_score:+ranked[0].confidence.toFixed(3),sha256:crypto.createHash('sha256').update(buffer).digest('hex')};
 report.attached++;console.log('PHOTO',p.sku,filename);
 }catch(e){report.unmatched.push({slug:p.slug,brand,reason:String(e)})}
 }
}
if(apply)await fs.writeFile(mapPath,JSON.stringify(mapping,null,2)+'\n');
await fs.writeFile('supplier-photo-sync-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({apply,processed:report.processed,attached:report.attached,unmatched:report.unmatched.length,errors:report.errors.length}));
