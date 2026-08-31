import { promises as fs } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const root = path.join(process.cwd(), "legacy-source");

function compact(value, max = 9000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clean(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  return $;
}

function summary($, selector) {
  return $(selector).slice(0, 30).map((_, el) => {
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
      text: compact(node.text(), 160),
    };
  }).get();
}

async function load(relative) {
  return clean(await fs.readFile(path.join(root, relative, "index.html"), "utf8"));
}

const home = clean(await fs.readFile(path.join(root, "index.html"), "utf8"));
console.log("=== HOME ===");
console.log("menu-toggles", JSON.stringify(summary(home, ".elementor-menu-toggle"), null, 2));
console.log("submenu-toggles", JSON.stringify(summary(home, ".has-submenu[aria-controls]"), null, 2));
console.log("cart-toggles", JSON.stringify(summary(home, "#elementor-menu-cart__toggle_button, .elementor-menu-cart__toggle_button"), null, 2));
console.log("cart-containers", JSON.stringify(summary(home, ".elementor-menu-cart__container, .elementor-menu-cart__main, .elementor-menu-cart__close-button, .widget_shopping_cart_content"), null, 2));
console.log("loop-add-buttons", JSON.stringify(summary(home, ".add_to_cart_button[data-product_id]"), null, 2));

const products = await fs.readdir(path.join(root, "product"), { withFileTypes: true });
console.log("product-count", products.filter((entry) => entry.isDirectory()).length);
console.log("product-slugs", products.filter((entry) => entry.isDirectory()).map((entry) => entry.name).slice(0, 80));

for (const relative of ["product/100-l-ascorbic-acid-powder", "product/gift-card", "product/glow-oil"]) {
  try {
    const $ = await load(relative);
    console.log(`\n=== /${relative}/ ===`);
    console.log("title", compact($("h1.product_title, h1.entry-title, h1").first().text(), 300));
    console.log("price", compact($(".summary .price, .product .price").first().text(), 300));
    console.log("image", $(".woocommerce-product-gallery img, .wp-post-image").first().attr("src"));
    console.log("cart-form", compact($.html($("form.cart").first()), 18000));
    console.log("quantity", JSON.stringify(summary($, "form.cart input.qty, form.cart input[name=quantity], .quantity input"), null, 2));
    console.log("add", JSON.stringify(summary($, "form.cart .single_add_to_cart_button, .add_to_cart_button[data-product_id]"), null, 2));
    console.log("variation-form", $("form.variations_form").length);
    console.log("variation-data", compact($("form.variations_form").first().attr("data-product_variations"), 18000));
    console.log("variation-selects", JSON.stringify(summary($, "form.variations_form select, form.variations_form input.variation_id, form.variations_form input[name=variation_id]"), null, 2));
    console.log("gallery-controls", JSON.stringify(summary($, ".woocommerce-product-gallery__trigger, .flex-control-thumbs img, .woocommerce-product-gallery__image a"), null, 2));
  } catch (error) {
    console.log(`FAILED /${relative}/`, String(error));
  }
}
