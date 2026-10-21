import fs from "node:fs";
const products=JSON.parse(fs.readFileSync("data/products.json","utf8"));
const categories=JSON.parse(fs.readFileSync("data/categories.json","utf8"));
if(!Array.isArray(products)||products.length<54)throw new Error("Legacy catalog unexpectedly lost items");
const slugSet=new Set();
const idSet=new Set();
for(const p of products){
 if(!p.slug||slugSet.has(p.slug))throw new Error("Missing/duplicate slug: "+p.slug);
 if(!p.id||idSet.has(p.id))throw new Error("Missing/duplicate ID: "+p.id);
 if(!["face","hair","body","other"].includes(p.category))throw new Error("Bad category: "+p.category);
 if(!Number.isFinite(Number(p.price))||Number(p.price)<0)throw new Error("Bad price: "+p.slug);
 if(Array.isArray(p.subcategory_slugs))for(const sub of p.subcategory_slugs){
  if(!categories.some(c=>c.parent_slug===p.category&&c.slug===sub))throw new Error("Unknown subcategory on "+p.slug);
 }
 idSet.add(p.id);slugSet.add(p.slug);
}
console.log(`Catalog valid: ${products.length} unique SKUs/rows by slug; ${categories.length} categories`);
