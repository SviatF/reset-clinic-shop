import assert from "node:assert/strict";
import {
  normalizeBulkPromotionInput,
  buildBulkPromotionPlan,
  promotionSnapshot,
  applyBulkPromotionPlan,
} from "../lib/bulk-promotions.ts";

const base = {
  brand: "OLIE'RE PARIS", category: "hair", status: "active",
  subcategory_slugs: ["shampoo"], product_line: "Valour",
  sku: "A", name: "Shampoo", slug: "shampoo", id: "a",
  price: 2470, sale_price: null, updated_at: "2026-11-16T00:00:00Z",
};
const products = [
  base,
  { ...base, id: "b", slug: "mask", sku: "B", name: "Mask", subcategory_slugs: ["mask"], sale_price: 1900 },
  { ...base, id: "c", slug: "face", sku: "C", name: "Face", category: "face", subcategory_slugs: ["cream"] },
  { ...base, id: "d", slug: "draft", sku: "D", name: "Draft", status: "draft" },
  { ...base, id: "legacy", slug: "parsley-seed-anti-oxidant-eye-cream" },
];
const params = {
  action: "apply", percent: 20, overwriteExisting: false,
  filters: {
    brand: "OLIE'RE PARIS", category: "hair", subcategory: "",
    productLine: "", query: "", status: "active", allProducts: false,
  },
};
const input = normalizeBulkPromotionInput(params);
const preview = buildBulkPromotionPlan(products, input);
assert.equal(preview.matchedCount, 2);
assert.equal(preview.eligibleCount, 1);
assert.equal(preview.skippedCount, 1);
assert.equal(preview.rows[0].proposedPrice, 1976);
assert.equal(preview.rows[0].savedAmount, 494);
assert.equal(preview.rows[1].reason, "Є індивідуальна знижка");

const before = JSON.stringify(products);
const applied = applyBulkPromotionPlan(products, preview, [], "updated");
assert.equal(applied.updatedCount, 1);
assert.equal(applied.products.find(p => p.id === "a").sale_price, 1976);
assert.equal(applied.products.find(p => p.id === "a").updated_at, "updated");
for (const id of ["b","c","d","legacy"]) assert.deepEqual(applied.products.find(p => p.id === id), products.find(p => p.id === id));
assert.equal(JSON.stringify(products), before, "Planning or application must not mutate input");

const excluded = applyBulkPromotionPlan(products, preview, ["a"], "updated");
assert.equal(excluded.updatedCount, 0);
assert.deepEqual(excluded.products, products);

const override = normalizeBulkPromotionInput({ ...params, overwriteExisting: true });
const overridePlan = buildBulkPromotionPlan(products, override);
assert.equal(overridePlan.eligibleCount, 2);
assert.equal(overridePlan.rows[1].proposedPrice, 1976);

const clear = normalizeBulkPromotionInput({ ...params, action: "remove" });
const clearPlan = buildBulkPromotionPlan(products, clear);
assert.equal(clearPlan.eligibleCount, 1);
assert.equal(clearPlan.rows[1].proposedPrice, 2470);
const cleared = applyBulkPromotionPlan(products, clearPlan, [], "updated");
assert.equal(cleared.products.find(p => p.id === "b").sale_price, null);
assert.equal(cleared.products.find(p => p.id === "a").sale_price, null);

const shampooOnly = normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, subcategory: "shampoo" } });
assert.deepEqual(buildBulkPromotionPlan(products, shampooOnly).rows.map(p => p.id), ["a"]);
const lineOnly = normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, brand: "", category: "", productLine: "Valour" } });
assert.equal(buildBulkPromotionPlan(products, lineOnly).matchedCount, 3);
const searchOnly = normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, brand: "", category: "", query: "Mask" } });
assert.deepEqual(buildBulkPromotionPlan(products, searchOnly).rows.map(p => p.id), ["b"]);
const allExplicit = normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, brand: "", category: "", allProducts: true } });
assert.equal(buildBulkPromotionPlan(products, allExplicit).matchedCount, 3);
const allImplicit = { ...params, filters: { ...params.filters, brand: "", category: "" } };
assert.throws(() => normalizeBulkPromotionInput(allImplicit), /Вкажіть хоча б бренд/);
assert.throws(() => normalizeBulkPromotionInput({ ...params, percent: 100 }), /Знижка/);
assert.throws(() => normalizeBulkPromotionInput({ ...params, percent: -20 }), /Знижка/);
assert.throws(() => normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, category: "otherwrong" } }), /категорія/i);
assert.throws(() => normalizeBulkPromotionInput({ ...params, filters: { ...params.filters, brand: "", category: "", subcategory: "shampoo" } }), /Для підкатегорії/);

const fingerprint = promotionSnapshot(products, input);
assert.equal(fingerprint, promotionSnapshot(products.map(p => ({ ...p })), input));
assert.notEqual(fingerprint, promotionSnapshot(products.map(p => p.id === "a" ? { ...p, price: 3000 } : p), input));
assert.notEqual(fingerprint, promotionSnapshot(products, override));

const tiny = { ...base, id: "tiny", slug: "tiny", price: 0.01 };
const tinyPlan = buildBulkPromotionPlan([tiny], input);
assert.equal(tinyPlan.eligibleCount, 0);
console.log("Bulk promotions safety, selection and pricing tests passed");
