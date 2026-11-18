import assert from "node:assert/strict";
import { DEFAULT_CATEGORIES, specialistSubcategories, productSubcategories } from "../lib/catalog-taxonomy.ts";

for (const [parent, slug] of [["face","eye-care"],["face","lip-care"],["face","spot-treatment"],["body","hand-care"],["hair","treatment"]]) {
  assert(DEFAULT_CATEGORIES.some(row => row.parent_slug === parent && row.slug === slug && row.status === "active"), parent + ":" + slug);
}
assert.deepEqual(specialistSubcategories("Dermafirm Зволожуюча пінка для очищення", "face"), []);
assert.deepEqual(specialistSubcategories("Cetaphil Міцелярна емульсія для очищення", "face"), []);
assert.deepEqual(specialistSubcategories("Крем для шкіри навколо очей", "face"), ["eye-care"]);
assert.deepEqual(specialistSubcategories("Vitamin U Lip Balm для губ", "face"), ["lip-care"]);
assert.deepEqual(specialistSubcategories("Vanishing Spot Gel", "face"), ["spot-treatment"]);
assert.deepEqual(specialistSubcategories("Anti-aging Hand Cream для рук", "body"), ["hand-care"]);
assert.deepEqual(specialistSubcategories("Шампунь проти лупи", "hair"), ["treatment"]);
assert.deepEqual(productSubcategories({name:"Eye Cream",category:"face",subcategory_slugs:["cream"]}), ["cream","eye-care"]);
assert.deepEqual(productSubcategories({name:"Лікувальний шампунь",category:"hair",subcategory_slugs:["shampoo"]}), ["shampoo","treatment"]);
assert.deepEqual(productSubcategories({name:"Eye Cream",category:"face",subcategory_slugs:[]}), []);
console.log("Specialist category links are correct");
