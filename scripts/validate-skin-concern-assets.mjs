import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const names=[
  "01-wrinkles",
  "02-pigmentation",
  "03-redness",
  "04-dullness",
  "05-acne",
  "06-dehydration",
  "07-pores",
  "08-barrier"
];
const taxonomy=fs.readFileSync("lib/ready-basket-taxonomy.ts","utf8");
for (const name of names) {
  const expectedUrl="/skin-concerns/"+name+"-hq.webp";
  assert.ok(taxonomy.includes(expectedUrl),"Missing expected photo mapping: "+name);
  const filename=path.join("public","skin-concerns",name+"-hq.webp");
  const buffer=fs.readFileSync(filename);
  assert.ok(buffer.length>=100000,"Suspected overcompressed image: "+filename+" "+buffer.length+" bytes");
  assert.ok(buffer.length<=3*1024*1024,"Unexpectedly huge image: "+filename);
  assert.equal(buffer.toString("ascii",0,4),"RIFF","Not a WebP RIFF file: "+filename);
  assert.equal(buffer.toString("ascii",8,12),"WEBP","Missing WebP magic: "+filename);
  console.log(name,Math.round(buffer.length/1024)+" KB");
}
console.log("8/8 concern photographs are full-quality WebP files.");
