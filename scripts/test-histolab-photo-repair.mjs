import assert from "node:assert/strict";
import fs from "node:fs";
import {officialHistoImageUrl,extractOfficialHistolabImage,photoMimeFromBytes}
 from "../lib/histolab-photo-repair.ts";
const sources=JSON.parse(fs.readFileSync("data/histolab-official-photo-sources.json","utf8"));
const products=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const known=new Map(products.map(p=>[p.slug,p]));
assert.equal(Object.keys(sources).length,24);
for(const [slug,source] of Object.entries(sources)) {
  assert.equal(known.get(slug)?.brand,"Histolab","No unknown item may be mapped: "+slug);
  assert.equal(known.get(slug)?.image_url,null,"Only missing-photo items may be mapped: "+slug);
  assert.equal(new URL(source.sourcePage).hostname,"histolab.com.ua");
  assert.ok(source.sourcePage.startsWith("https://histolab.com.ua/"));
  if(source.verifiedImageUrl)
    assert.equal(officialHistoImageUrl(source.verifiedImageUrl,source.sourcePage),
      source.verifiedImageUrl);
}
assert.equal(new Set(Object.values(sources).map(s=>s.sourcePage)).size,24,"Each SKU needs its own exact product page");
assert.equal(officialHistoImageUrl("http://histolab.com.ua/image/p.jpg","https://histolab.com.ua/"),null);
assert.equal(officialHistoImageUrl("https://evil.com/image/p.jpg","https://histolab.com.ua/"),null);
assert.equal(officialHistoImageUrl("https://histolab.com.ua.evil.com/image/p.jpg","https://histolab.com.ua/"),null);
assert.equal(officialHistoImageUrl("https://histolab.com.ua/admin/media.jpg","https://histolab.com.ua/"),null);
const page="https://histolab.com.ua/zvolozhennya/krem";
const html='<meta name="twitter:image" content="/image/product.png">'+
  '<meta property="og:image" content="https://histolab.com.ua/image/catalog/verified.webp">'+
  '<section>Рекомендовані <img src="https://histolab.com.ua/image/cache/big-other.webp"></section>';
assert.equal(extractOfficialHistolabImage(html,page),"https://histolab.com.ua/image/product.png");
assert.equal(extractOfficialHistolabImage('<img src="/image/big-other.webp">',page),null,
  "Must not pick unrelated recommendation image");
assert.equal(photoMimeFromBytes(Uint8Array.from([255,216,255,1,2,3]),"image/jpeg"),"jpg");
assert.equal(photoMimeFromBytes(Uint8Array.from([137,80,78,71,13,10,26,10]),"image/png"),"png");
assert.equal(photoMimeFromBytes(Uint8Array.from([...Buffer.from("RIFF"),0,0,0,0,...Buffer.from("WEBP")]),"image/webp"),"webp");
assert.equal(photoMimeFromBytes(Uint8Array.from([60,104,116,109,108]),"image/jpeg"),null);
console.log("Histolab official-image safety: 24 exact pages, host guard, metadata and file checks passed");
