import assert from "node:assert/strict";
import { getProductPricing, validateSalePrice } from "../lib/product-pricing.ts";
assert.deepEqual(getProductPricing({ price: 1000 }), { price:1000, originalPrice:1000, discountPercent:0, onSale:false });
assert.deepEqual(getProductPricing({ price: 1000, sale_price: 800 }), { price:800, originalPrice:1000, discountPercent:20, onSale:true });
assert.deepEqual(getProductPricing({ price: 999, sale_price: 799.2 }), { price:799.2, originalPrice:999, discountPercent:20, onSale:true });
assert.equal(getProductPricing({ price: 400, sale_price: null }).price, 400);
assert.equal(getProductPricing({ price: 400, sale_price: 999 }).price, 400);
assert.equal(validateSalePrice(1000, null), null);
assert.equal(validateSalePrice(1000, 800), 800);
assert.equal(validateSalePrice(1000, "799.90"), 799.90);
for (const sale of [0, -10, 1000, 1200, "oops", 799.999, Infinity]) {
  assert.throws(() => validateSalePrice(1000, sale));
}
assert.throws(() => validateSalePrice(0, 10));
console.log("Product promotional pricing tests passed");
