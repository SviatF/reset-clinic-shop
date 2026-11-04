#!/usr/bin/env node
/**
 * Register EXISTING D1/R2 resources. The default mode only adds bindings.
 * Cutover is deliberately separate and requires --activate --confirmed-migrated.
 *
 * node scripts/configure-shop-cloudflare.mjs --database-id UUID --database-name reset-clinic-shop-db --bucket reset-clinic-shop-media
 */
import fs from "node:fs";
import path from "node:path";
const args=process.argv.slice(2);
function option(name) { const index=args.indexOf("--"+name); return index>=0?args[index+1]:undefined; }
const id=option("database-id");
const databaseName=option("database-name")||"reset-clinic-shop-db";
const bucket=option("bucket")||"reset-clinic-shop-media";
const activate=args.includes("--activate");
if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
 throw new Error("Supply a real Cloudflare D1 database UUID: --database-id <UUID>");
if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(databaseName)||
   !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))
 throw new Error("Invalid Cloudflare D1/R2 resource name.");
if(activate&&!args.includes("--confirmed-migrated"))
 throw new Error("Cutover requires --activate --confirmed-migrated AFTER matching all 5 D1 document hashes to the private migration manifest.");
const configFile="wrangler.jsonc";
const source=fs.readFileSync(configFile,"utf8");
const config=JSON.parse(source);
const db={binding:"SHOP_DB",database_name:databaseName,database_id:id};
const r2={binding:"SHOP_MEDIA",bucket_name:bucket};
config.d1_databases=[...(config.d1_databases||[]).filter(item=>item.binding!=="SHOP_DB"),db];
config.r2_buckets=[...(config.r2_buckets||[]).filter(item=>item.binding!=="SHOP_MEDIA"),r2];
if(activate){
 config.vars={...config.vars,
   SHOP_STORAGE_BACKEND:"cloudflare",
   SHOP_PRODUCTS_BACKEND:"d1",
   SHOP_MEDIA_BACKEND:"r2"
 };
} else {
 // Do not turn on D1 until the data is imported and verified.
 delete config.vars?.SHOP_STORAGE_BACKEND;
 delete config.vars?.SHOP_PRODUCTS_BACKEND;
 delete config.vars?.SHOP_MEDIA_BACKEND;
}
fs.mkdirSync("migration-backups",{recursive:true});
const backup=path.join("migration-backups","wrangler-before-d1.jsonc");
if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{mode:0o600});
fs.writeFileSync(configFile,JSON.stringify(config,null,2)+"\n");
console.log("Registered SHOP_DB and SHOP_MEDIA in wrangler.jsonc.");
console.log(activate
 ? "D1/R2 cutover flags enabled. SHOP_STAGING has not been changed; payment activation is a separate action."
 : "STAGED ONLY: no storage cutover flags were enabled. Import & verify snapshot before activating.");
