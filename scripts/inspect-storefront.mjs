import { promises as fs } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

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

function compact(value, max = 8000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function summary($, selector) {
  return $(selector)
    .slice(0, 20)
    .map((_, el) => {
      const node = $(el);
      return {
        tag: el.tagName,
        id: node.attr("id"),
        class: node.attr("class"),
        href: node.attr("href"),
        action: node.attr("action"),
        name: node.attr("name"),
        value: node.attr("value"),
        type: node.attr("type"),
        productId: node.attr("data-product_id"),
        productSku: node.attr("data-product_sku"),
        quantity: node.attr("data-quantity"),
        ariaExpanded: node.attr("aria-expanded"),
        ariaControls: node.attr("aria-controls"),
        text: compact(node.text(), 180),
      };
    })
    .get();
}

function cleanDocument(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  return $;
}

const homeHtml = await fs.readFile(path.join(root, "index.html"), "utf8");
const home = cleanDocument(homeHtml);
console.log("=== HOME INTERACTION MARKUP ===");
console.log("menu-toggles", JSON.stringify(summary(home, ".elementor-menu-toggle"), null, 2));
console.log("menu-containers", JSON.stringify(summary(home, ".elementor-nav-menu__container"), null, 2));
console.log("submenu-toggles", JSON.stringify(summary(home, ".has-submenu[aria-controls]"), null, 2));
console.log("cart-toggles", JSON.stringify(summary(home, "#elementor-menu-cart__toggle_button, .elementor-menu-cart__toggle_button"), null, 2));
console.log("cart-containers", JSON.stringify(summary(home, ".elementor-menu-cart__container, .elementor-menu-cart__main, .elementor-menu-cart__close-button"), null, 2));
console.log("loop-add-buttons", JSON.stringify(summary(home, ".add_to_cart_button[data-product_id]"), null, 2));

const files = await walk(root);
console.log(`html-documents=${files.length}`);

const productPages = [];
const variablePages = [];
const cartPages = [];
const checkoutPages = [];

for (const file of files) {
  const html = await fs.readFile(file, "utf8");
  const $ = cleanDocument(html);
  const route = routeFor(file);
  if ($("form.cart .single_add_to_cart_button").length) productPages.push({ route, file, $ });
  if ($("form.variations_form").length) variablePages.push({ route, file, $ });
  if ($("form.woocommerce-cart-form, .woocommerce-cart-form").length) cartPages.push({ route, file, $ });
  if ($("form.checkout, form.woocommerce-checkout, #place_order").length) checkoutPages.push({ route, file, $ });
}

console.log("product-routes", productPages.map((item) => item.route).slice(0, 30));
console.log("variable-routes", variablePages.map((item) => item.route).slice(0, 30));
console.log("cart-routes", cartPages.map((item) => item.route).slice(0, 20));
console.log("checkout-routes", checkoutPages.map((item) => item.route).slice(0, 20));

function printProduct(item, label) {
  if (!item) return;
  const { route, $ } = item;
  console.log(`\n=== ${label} ${route} ===`);
  console.log("title", compact($("h1.product_title, h1.entry-title, h1").first().text(), 300));
  console.log("price", compact($(".summary .price, .product .price").first().text(), 300));
  console.log("image", $(".woocommerce-product-gallery img, .wp-post-image").first().attr("src"));
  console.log("cart-form", compact($.html($("form.cart").first()), 16000));
  console.log("qty", JSON.stringify(summary($, "form.cart input.qty, form.cart input[name=quantity], .quantity input"), null, 2));
  console.log("add", JSON.stringify(summary($, "form.cart .single_add_to_cart_button, .add_to_cart_button[data-product_id]"), null, 2));
}

printProduct(productPages[0], "SIMPLE PRODUCT");
printProduct(variablePages[0], "VARIABLE PRODUCT");

if (variablePages[0]) {
  const { $ } = variablePages[0];
  const form = $("form.variations_form").first();
  console.log("variation-data", compact(form.attr("data-product_variations"), 12000));
  console.log("variation-selects", JSON.stringify(summary($, "form.variations_form select, form.variations_form input.variation_id, form.variations_form input[name=variation_id]"), null, 2));
  console.log("variation-price", compact($(".woocommerce-variation-price, .single_variation").first().text(), 500));
}

if (cartPages[0]) {
  const { route, $ } = cartPages[0];
  console.log(`\n=== CART PAGE ${route} ===`);
  console.log("cart-form", compact($.html($("form.woocommerce-cart-form").first()), 16000));
  console.log("cart-actions", JSON.stringify(summary($, ".woocommerce-cart-form .remove, .woocommerce-cart-form input.qty, .woocommerce-cart-form button[name=update_cart], .wc-proceed-to-checkout a"), null, 2));
}

if (checkoutPages[0]) {
  const { route, $ } = checkoutPages[0];
  console.log(`\n=== CHECKOUT PAGE ${route} ===`);
  console.log("checkout-form", compact($.html($("form.checkout, form.woocommerce-checkout").first()), 18000));
  console.log("checkout-fields", JSON.stringify(summary($, "form.checkout input, form.checkout select, form.checkout textarea, #place_order"), null, 2));
}
