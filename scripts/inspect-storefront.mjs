import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "legacy-source");

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name === "index.html") out.push(full);
  }
  return out;
}

function routeFor(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  return relative === "index.html" ? "/" : `/${relative.replace(/\/index\.html$/, "")}/`;
}

function attrs(tag) {
  const pick = {};
  for (const name of ["id", "class", "name", "type", "value", "href", "action", "data-product_id", "data-product_sku", "data-product_variations", "aria-expanded", "aria-controls"]) {
    const attrName = name.replaceAll("_", "[_-]");
    const match = tag.match(new RegExp(`\\b${attrName}=["']([^"']*)["']`, "i"));
    if (match) pick[name] = match[1].slice(0, 500);
  }
  return pick;
}

function printTags(label, html, pattern, limit = 20) {
  const matches = [...html.matchAll(pattern)].slice(0, limit);
  console.log(`\n${label} count=${matches.length}`);
  for (const [index, match] of matches.entries()) {
    const tag = match[0].replace(/\s+/g, " ").slice(0, 1200);
    console.log(`#${index + 1}`, JSON.stringify(attrs(tag)), tag);
  }
}

const home = await fs.readFile(path.join(root, "index.html"), "utf8");
console.log("=== HOME INTERACTION MARKUP ===");
printTags("buttons", home, /<(?:button|a)[^>]*(?:menu|toggle|hamburger|cart|search)[^>]*>/gi, 40);
printTags("nav-ish", home, /<(?:nav|div|ul)[^>]*class=["'][^"']*(?:menu|nav|header|mobile|offcanvas|popup)[^"']*["'][^>]*>/gi, 50);

const files = await walk(root);
console.log(`\nhtml-documents=${files.length}`);

const interesting = [];
for (const file of files) {
  const html = await fs.readFile(file, "utf8");
  const hasSimple = /single_add_to_cart_button/i.test(html);
  const hasVariable = /variations_form/i.test(html) || /data-product_variations/i.test(html);
  const hasCart = /woocommerce-cart-form/i.test(html) || /cart_item/i.test(html);
  const hasCheckout = /woocommerce-checkout/i.test(html) || /checkout_place_order/i.test(html);
  if (hasSimple || hasVariable || hasCart || hasCheckout) {
    interesting.push({ file, html, hasSimple, hasVariable, hasCart, hasCheckout });
  }
}

console.log(`interesting-documents=${interesting.length}`);
for (const item of interesting.slice(0, 12)) {
  console.log(`\n=== ROUTE ${routeFor(item.file)} simple=${item.hasSimple} variable=${item.hasVariable} cart=${item.hasCart} checkout=${item.hasCheckout} ===`);
  printTags("forms", item.html, /<form\b[^>]*>/gi, 20);
  printTags("buttons", item.html, /<(?:button|a)\b[^>]*(?:add_to_cart|single_add_to_cart|checkout|remove|quantity|plus|minus)[^>]*>/gi, 30);
  printTags("inputs/selects", item.html, /<(?:input|select)\b[^>]*(?:quantity|variation|product|cart|checkout|billing|shipping)[^>]*>/gi, 40);
}

const variable = interesting.find((item) => item.hasVariable);
if (variable) {
  console.log(`\n=== FIRST VARIABLE PRODUCT ${routeFor(variable.file)} ===`);
  const form = variable.html.match(/<form\b[^>]*variations_form[^>]*>[\s\S]{0,30000}?<\/form>/i)?.[0];
  if (form) console.log(form.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ").slice(0, 12000));
}
