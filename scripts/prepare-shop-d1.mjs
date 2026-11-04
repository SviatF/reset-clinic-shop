#!/usr/bin/env node
/**
 * Safe, resumable Cloudflare D1 import for RESET Clinic documents.
 * Generate SQL and a checksum manifest from a privately exported snapshot.
 * This script NEVER connects to Cloudflare, writes to GitHub or deletes data.
 *
 * Usage: node scripts/prepare-shop-d1.mjs PRIVATE-SNAPSHOT.json migration-backups/shop-d1-import.sql
 * Important: This script does NOT enable SHOP_STORAGE_BACKEND.
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

const [source, destination="migration-backups/shop-d1-import.sql"] = process.argv.slice(2);
if (!source) {
  console.error("Usage: node scripts/prepare-shop-d1.mjs snapshot.json [migration-backups/shop-d1-import.sql]");
  process.exit(1);
}
const snapshot = JSON.parse(fs.readFileSync(source, "utf8"));
const fields = ["products", "categories", "brands", "orders", "activity"];
for (const field of fields) {
  if (!Array.isArray(snapshot[field])) throw new Error("Snapshot is missing an array: " + field);
}
if (!snapshot.exported_at) throw new Error("Expected authenticated storage export with exported_at.");
const slugs = new Set();
for (const product of snapshot.products) {
  if (typeof product.slug !== "string" || !product.slug || !product.id) throw new Error("Invalid product in snapshot.");
  if (slugs.has(product.slug)) throw new Error("Duplicate product slug: " + product.slug);
  slugs.add(product.slug);
}
const orderIds = new Set();
for (const order of snapshot.orders) {
  if (!order.id || orderIds.has(String(order.id))) throw new Error("Duplicate/missing order ID in snapshot.");
  orderIds.add(String(order.id));
}
const quote = s => "'" + String(s).replace(/'/g, "''") + "'";
const statements = [];
function statement(sql) {
  if (Buffer.byteLength(sql, "utf8") > 100000) throw new Error("D1 100 KB SQL statement limit exceeded.");
  statements.push(sql + ";");
}
function fragments(text) {
  const output = [];
  let current = "", bytes = 0;
  // Split only on whole Unicode code points to preserve JSON content.
  for (const cp of text) {
    const size = Buffer.byteLength(cp, "utf8") + (cp === "'" ? 1 : 0);
    if (bytes + size > 55000 && current) {
      output.push(current);
      current = "";
      bytes = 0;
    }
    current += cp;
    bytes += size;
  }
  if (current) output.push(current);
  return output;
}
statement("CREATE TABLE IF NOT EXISTS shop_import_chunks (pathname TEXT NOT NULL, position INTEGER NOT NULL, fragment TEXT NOT NULL, PRIMARY KEY(pathname,position))");
const summary = [];
for (const field of fields) {
  const pathname = "data/" + field + ".json";
  const json = JSON.stringify(snapshot[field]);
  const size = Buffer.byteLength(json, "utf8");
  // Cloudflare D1 has a 2 MB max BLOB/string/row size.
  if (size > 1900000) throw new Error(pathname + " exceeds safe 1.9 MB document size; use per-record tables instead.");
  const parts = fragments(json);
  statement("DELETE FROM shop_import_chunks WHERE pathname = " + quote(pathname));
  parts.forEach((part, index) => statement(
    "INSERT INTO shop_import_chunks(pathname,position,fragment) VALUES (" +
    quote(pathname) + "," + index + "," + quote(part) + ")"
  ));
  // Never overwrite an existing document. Retry is safe, but verify hashes
  // before enabling D1: a pre-existing document may differ from this snapshot.
  statement("INSERT OR IGNORE INTO shop_documents(pathname,content,version,updated_at) " +
    "SELECT " + quote(pathname) + ", " +
    "(SELECT group_concat(fragment,'') FROM " +
    "(SELECT fragment FROM shop_import_chunks WHERE pathname = " + quote(pathname) +
    " ORDER BY position)), 1, datetime('now')");
  statement("DELETE FROM shop_import_chunks WHERE pathname = " + quote(pathname));
  summary.push({
    pathname, records: snapshot[field].length, bytes: size,
    sha256: createHash("sha256").update(json).digest("hex"), chunks: parts.length
  });
}
statement("SELECT pathname, json_array_length(content) AS records FROM shop_documents ORDER BY pathname");
const dir = path.dirname(destination);
fs.mkdirSync(dir, {recursive:true});
fs.writeFileSync(destination, statements.join("\n") + "\n", {mode:0o600});
const manifestPath = destination.replace(/\.sql$/i, "") + ".manifest.json";
fs.writeFileSync(manifestPath, JSON.stringify({
  source_exported_at:snapshot.exported_at,
  generated_at:new Date().toISOString(),
  documents:summary
},null,2)+"\n",{mode:0o600});
console.log("Wrote D1 import SQL: " + destination);
console.log("Wrote checksum manifest: " + manifestPath);
console.log(summary.map(row=>row.pathname+": "+row.records+" records, "+row.chunks+" chunks").join("\n"));
console.log("No database or repository data was changed. Existing D1 documents will NOT be overwritten.");
