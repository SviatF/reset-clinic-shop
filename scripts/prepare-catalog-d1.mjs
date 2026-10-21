#!/usr/bin/env node
/**
 * Generate a D1 import SQL file from the CURRENT exported catalog.
 * Usage: node scripts/prepare-catalog-d1.mjs ./reset-catalog-backup.json ./catalog-import.sql
 * This script DOES NOT connect to Cloudflare or mutate any database.
 */
import fs from "node:fs";
import process from "node:process";
const [source,destination="./catalog-import.sql"]=process.argv.slice(2);
if(!source)throw new Error("Provide a catalog backup JSON path; see /api/admin/catalog-export");
const snapshot=JSON.parse(fs.readFileSync(source,"utf8"));
if(!Array.isArray(snapshot.products)||!Array.isArray(snapshot.categories))throw new Error("Invalid export: products and categories arrays required");
const slugs=new Set();
for(const row of snapshot.products){
 if(!row.id||!row.slug||!row.name)throw new Error("Invalid product record");
 if(slugs.has(row.slug))throw new Error("Duplicate product slug: "+row.slug);
 slugs.add(row.slug);
}
const escape=(value)=>String(value).replace(/'/g,"''");
const rows=[["data/products.json",snapshot.products],["data/categories.json",snapshot.categories],...(Array.isArray(snapshot.brands)?[["data/brands.json",snapshot.brands]]:[])];
const sql=["BEGIN TRANSACTION;",...rows.map(([path,data])=>
 `INSERT INTO shop_documents (pathname,content,version,updated_at)
 VALUES ('${escape(path)}','${escape(JSON.stringify(data))}',1,datetime('now'))
 ON CONFLICT(pathname) DO UPDATE SET content=excluded.content,version=shop_documents.version+1,updated_at=datetime('now');`),"COMMIT;",""];
fs.writeFileSync(destination,sql.join("\n"),"utf8");
console.log(`Wrote ${destination}: ${snapshot.products.length} products, ${snapshot.categories.length} categories`);
console.log("No remote database or GitHub branch was changed.");
