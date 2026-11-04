#!/usr/bin/env node
/**
 * Compare manifest from prepare-shop-d1 with an authenticated JSON response
 * downloaded from /api/admin/storage-verify. No network or write operations.
 *
 * Usage: node scripts/verify-shop-d1.mjs migration-backups/shop-d1-import.manifest.json migration-backups/storage-verify.json
 */
import fs from "node:fs";
const [manifestFile, responseFile] = process.argv.slice(2);
if (!manifestFile || !responseFile) throw new Error("Expected private manifest and D1 verification JSON paths.");
const manifest = JSON.parse(fs.readFileSync(manifestFile,"utf8"));
const response = JSON.parse(fs.readFileSync(responseFile,"utf8"));
const actual = new Map((response.documents||[]).map(row=>[row.pathname,row]));
const errors=[];
for (const entry of manifest.documents||[]) {
 const row=actual.get(entry.pathname);
 if(!row) {errors.push(entry.pathname+": missing D1 document");continue;}
 if(row.version===null)errors.push(entry.pathname+": not persisted");
 if(row.records!==entry.records)errors.push(entry.pathname+": record count "+row.records+" vs expected "+entry.records);
 if(row.sha256!==entry.sha256)errors.push(entry.pathname+": SHA-256 mismatch (D1 differs from exported source)");
}
if((manifest.documents||[]).length!==5)errors.push("Expected all five source documents.");
if(!response.r2Bound)errors.push("Missing SHOP_MEDIA R2 binding.");
if(errors.length){
 console.error("CUTOVER BLOCKED: "+errors.join("\n"));
 process.exitCode=1;
} else {
 console.log("READY FOR CUTOVER: five D1 document hashes and row counts match the private source; R2 binding is visible.");
 console.log("Run configure-shop-cloudflare.mjs with --activate --confirmed-migrated only after confirming uploads and a maintenance window.");
}
