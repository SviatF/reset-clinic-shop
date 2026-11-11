import fs from "node:fs";
const products = JSON.parse(fs.readFileSync("data/products.json", "utf8"));
const log = JSON.parse(fs.readFileSync("data/supplier-import-2026-11-11.json", "utf8"));
const productBySlug = new Map(products.map(item => [item.slug, item]));
if (productBySlug.size !== products.length) throw new Error("Duplicate product slugs");
if (log.items.length !== log.totals.added) throw new Error("Supplier import count mismatch");
const allowedBrands = new Set(["Histolab", "HydroPeptide", "Cetaphil", "Sensilis", "DÉCAAR", "CU SKIN"]);
const supportedSources = new Map([
 ["Histolab", "histolab.com.ua"],
 ["HydroPeptide", "hydropeptide.ua"],
 ["Cetaphil", "avepharm.com.ua"],
 ["Sensilis", "sensilis.com.ua"],
 ["DÉCAAR", "decaar.com.ua"],
 ["CU SKIN", "cu.ua"]
]);
let missingPrices = 0;
for (const entry of log.items) {
 if (!allowedBrands.has(entry.brand)) throw new Error("Unknown brand " + entry.brand);
 const product = productBySlug.get(entry.slug);
 if (!product || product.brand !== entry.brand) throw new Error("Source row missing " + entry.slug);
 if (product.status !== "draft" || product.stock_quantity !== 0 || product.track_stock !== true || product.published_at !== null)
   throw new Error("Unreviewed supplier product is not a safe draft: " + entry.slug);
 const url = new URL(entry.source_url);
 if (url.protocol !== "https:" || ![supportedSources.get(entry.brand), "www."+supportedSources.get(entry.brand)].includes(url.hostname))
   throw new Error("Non-allowlisted product source: " + entry.source_url);
 if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) throw new Error("Invalid draft price: " + entry.slug);
 if (product.price === 0) missingPrices++;
}
console.log("Supplier import valid:", log.items.length, "safe drafts,", missingPrices, "with price awaiting verification");
