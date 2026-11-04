#!/usr/bin/env node
/** Offline test of the D1 import generator with a catalog >100 KB. */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"reset-shop-d1-"));
try {
 const snapshotPath=path.join(dir,"source.json");
 const sqlPath=path.join(dir,"shop.sql");
 const products=Array.from({length:550},(_,i)=>({
  id:"test_"+i,slug:"test-"+i,name:"Крем №"+i,
  description:"Зволожувальний догляд для обличчя. ".repeat(18),price:100+i
 }));
 fs.writeFileSync(snapshotPath,JSON.stringify({
  exported_at:"2026-11-04T00:00:00.000Z",
  products,categories:[],brands:[],orders:[],activity:[]
 }));
 const result=spawnSync(process.execPath,["scripts/prepare-shop-d1.mjs",snapshotPath,sqlPath],{
  cwd:process.cwd(),encoding:"utf8"
 });
 assert.equal(result.status,0,result.stderr||result.stdout);
 const sql=fs.readFileSync(sqlPath,"utf8");
 const commands=sql.trim().split("\n");
 assert(commands.every(line=>Buffer.byteLength(line,"utf8")<=100000),"100 KB statement limit");
 assert(commands.filter(line=>line.startsWith("INSERT INTO shop_import_chunks")).length>1,"chunking not exercised");
 assert.equal(commands.filter(line=>line.startsWith("INSERT OR IGNORE INTO shop_documents")).length,5);
 assert(!sql.includes("UPDATE shop_documents SET"),"import may overwrite destination");
 const manifest=JSON.parse(fs.readFileSync(sqlPath.replace(/\.sql$/i,"")+".manifest.json","utf8"));
 assert.equal(manifest.documents.length,5);
 assert.equal(manifest.documents[0].records,550);
 assert(manifest.documents[0].chunks>1);
 console.log("D1 import generator test passed: 550 Unicode records chunked safely, five documents, no overwrites.");
} finally {
 fs.rmSync(dir,{recursive:true,force:true});
}
