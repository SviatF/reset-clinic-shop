import assert from "node:assert/strict";
import fs from "node:fs";
import {
 officialPageUrl, officialImageUrl, supportsOfficialProductIdentity,
 extractProductPhoto, imageExtension,
} from "../lib/verified-supplier-media.ts";
const manifest=JSON.parse(fs.readFileSync("data/verified-supplier-photo-pages.json","utf8"));
const catalog=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const bySlug=new Map(catalog.map(p=>[p.slug,p]));
const domains=new Set(["hydropeptide.ua","hydropeptide.com","sensilis.com.ua","decaar.com.ua"]);
assert.equal(Object.keys(manifest).length,36);
for(const [slug,source] of Object.entries(manifest)){
 const product=bySlug.get(slug);
 assert.ok(product,"No corresponding merchant item "+slug);
 assert.equal(product.brand,source.brand);
 assert.equal(product.image_url,null,"Only source items without photos: "+slug);
 assert.ok(domains.has(new URL(source.page).hostname));
 assert.ok(officialPageUrl(source.page,source.brand));
 assert.ok(source.title.length>6);
 const head="<title>"+source.title+" | "+source.brand+"</title>";
 assert.ok(supportsOfficialProductIdentity(head,source),"Missing title identity: "+slug);
}
const test=manifest["supplier-sensilis-upgrade-day-cream"];
const html='<title>Upgrade Day Cream | Sensilis</title>'+
 '<meta property="og:image" content="https://sensilis.com.ua/image/cache/catalog/product/upgrade-day-cream.jpg">'+
 '<img src="https://sensilis.com.ua/image/cache/catalog/other-product.jpg">';
assert.ok(supportsOfficialProductIdentity(html,test));
assert.equal(extractProductPhoto(html,test),
 "https://sensilis.com.ua/image/cache/catalog/product/upgrade-day-cream.jpg");
assert.equal(extractProductPhoto('<img src="https://sensilis.com.ua/image/cache/catalog/other-product.jpg">',test),null);
assert.equal(officialImageUrl("http://sensilis.com.ua/image/img.jpg",test),null);
assert.equal(officialImageUrl("https://malicious.com/image/img.jpg",test),null);
assert.equal(officialImageUrl("https://sensilis.com.ua.evil.com/img.jpg",test),null);
assert.equal(officialImageUrl("https://sensilis.com.ua/images/logo.jpg",test),null);
assert.equal(imageExtension(Uint8Array.from([255,216,255,1]),"image/jpeg"),"jpg");
assert.equal(imageExtension(Uint8Array.from([137,80,78,71,13,10,26,10]),"image/png"),"png");
assert.equal(imageExtension(Uint8Array.from([...Buffer.from("RIFF"),0,0,0,0,...Buffer.from("WEBP")]),"image/webp"),"webp");
assert.equal(imageExtension(Uint8Array.from([60,104,116,109,108]),"image/jpeg"),null);
const aa=manifest["supplier-decaar-absolute-hydro-cream"];
const plus=manifest["supplier-decaar-absolute-hydro-cream-2"];
assert.notEqual(aa.page,plus.page,"Hydro Cream and Hydro Cream+ must have distinct sources");
console.log("36 exact product pages and safe image metadata verified");
