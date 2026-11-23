import type { ProductRecord } from "@/lib/commerce-types";

/** Code-backed 1 UAH product. No D1 catalog mutation; disable with
 * SHOP_ONE_UAH_TEST_PRODUCT_ENABLED=false when verification is complete.
 */
export const ONE_UAH_TEST_PRODUCT_SLUG = "test-oplata-1-uah";
export const ONE_UAH_TEST_PRODUCT: ProductRecord = {
  id:"reset-test-payment-1uah", slug:ONE_UAH_TEST_PRODUCT_SLUG,
  name:"Тестова оплата — 1 грн", brand:"RESET Clinic", sku:"RESET-TEST-1UAH",
  category:"other", subcategory_slugs:[], product_line:null, status:"active",
  short_description:"Тест онлайн-оплати Monobank та події purchase у GA4. Справжнє списання 1 грн. Фізичний товар не доставляється.",
  description:"Технічна позиція для перевірки оплати в RESET Clinic Shop. Під час замовлення відбудеться реальна транзакція на 1 грн через Monobank. Це не косметика і не фізичний товар, доставку не передбачено.",
  price:1, sale_price:null, currency:"UAH",
  stock_quantity:0, track_stock:false, inventory_status:"auto",
  size:null, image_url:null, secondary_image_url:null,
  hover_label:"ТЕСТ ОПЛАТИ", hover_title:"Реальна транзакція на 1 грн",
  hover_text:"Без фізичного товару і доставки", how_to_use:null,
  key_ingredients:[], inci:null,
  seo_title:"Тестова оплата 1 грн — RESET Clinic Shop",
  seo_description:"Технічний товар для перевірки оплати Monobank та GA4.",
  seo_keywords:[], featured:false, sort_order:-100,
  published_at:"2026-11-24T00:00:00.000Z",
  created_at:"2026-11-24T00:00:00.000Z",
  updated_at:"2026-11-24T00:00:00.000Z"
};
export function withOneUahTestProduct(rows:ProductRecord[]):ProductRecord[] {
  if(process.env.SHOP_ONE_UAH_TEST_PRODUCT_ENABLED==="false")return rows;
  if(rows.some(row=>row.slug===ONE_UAH_TEST_PRODUCT_SLUG))return rows;
  return [ONE_UAH_TEST_PRODUCT,...rows];
}
