import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ProductRecord } from "@/lib/commerce-types";
import { appendActivity, mutateProducts, readProducts } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";
import { slugifyUkr } from "@/lib/slugify";
import { validateSalePrice } from "@/lib/product-pricing";
import { readCategories } from "@/lib/catalog-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set(["slug","name","brand","sku","category","subcategory_slugs","product_line","status","short_description","description","price","sale_price","stock_quantity","track_stock","inventory_status","size","image_url","secondary_image_url","hover_label","hover_title","hover_text","how_to_use","key_ingredients","inci","seo_title","seo_description","seo_keywords","featured","sort_order","published_at"]);

function sanitize(body: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body || {})) if (allowed.has(key)) next[key] = value;
  if ("slug" in next && typeof next.slug === "string") next.slug = slugifyUkr(next.slug);
  if ("price" in next) next.price = Math.max(0, Number(next.price) || 0);
  if ("inventory_status" in next && !["auto","unknown","out_of_stock"].includes(String(next.inventory_status))) throw new Error("Некоректний статус наявності");
  if ("stock_quantity" in next) next.stock_quantity = Math.max(0, Math.trunc(Number(next.stock_quantity) || 0));
  if ("sort_order" in next) next.sort_order = Math.trunc(Number(next.sort_order) || 0);
  if ("key_ingredients" in next && !Array.isArray(next.key_ingredients)) next.key_ingredients = [];
  if ("seo_keywords" in next && !Array.isArray(next.seo_keywords)) next.seo_keywords = [];
  if ("subcategory_slugs" in next && !Array.isArray(next.subcategory_slugs)) next.subcategory_slugs = [];
  return next;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "Сховище товарів недоступне для запису: налаштуйте Cloudflare D1 або GITHUB_TOKEN у середовищі магазину." }, { status: 503 });
  const { id } = await context.params;
  try {
    const changes = sanitize(await request.json());
    const categories=await readCategories();
    const nextProducts = await mutateProducts(`Admin: update product ${id}`, (products) => {
      const index = products.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Товар не знайдено");
      if (typeof changes.slug === "string" && products.some((item, i) => i !== index && item.slug === changes.slug)) throw new Error("Товар з таким slug вже існує");
      const requestedSku=typeof changes.sku==="string"?changes.sku.toLowerCase():"";
      if(requestedSku&&products.some((item,i)=>i!==index&&item.sku?.toLowerCase()===requestedSku))throw new Error("Товар з таким SKU вже існує");
      const current = products[index];
      const now = new Date().toISOString();
      const status = (changes.status || current.status) as ProductRecord["status"];
      const category=(changes.category || current.category) as ProductRecord["category"];
      const subs=Array.isArray(changes.subcategory_slugs)?changes.subcategory_slugs:current.subcategory_slugs||[];
      if(subs.some((slug:string)=>!categories.some(c=>c.parent_slug===category&&c.slug===slug&&c.status==="active")))throw new Error("Підкатегорія не належить до вибраного розділу");
      if(status==="active" && Number(changes.price ?? current.price)<=0 &&
         !(current.brand==="CU SKIN" && String(current.id).startsWith("cu-official-") && current.status==="active"))
        throw new Error("Не можна публікувати товар із нульовою ціною");
      const salePrice = validateSalePrice(changes.price ?? current.price, "sale_price" in changes ? changes.sale_price : current.sale_price);
      const updated = { ...current, ...changes, sale_price: salePrice, status, published_at: status === "active" ? current.published_at || now : current.published_at, updated_at: now } as ProductRecord;
      const copy = [...products];
      copy[index] = updated;
      return copy;
    });
    const updated = nextProducts.find((item) => item.id === id);
    if (!updated) return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
    try {
      await appendActivity({ event_type: "product_updated", entity_type: "product", entity_id: id, title: `Оновлено товар: ${updated.name}`, metadata: { fields: Object.keys(changes), status: updated.status, price: updated.price, sale_price: updated.sale_price, stock: updated.stock_quantity } });
    } catch (auditError) { console.error("Product updated; activity audit unavailable", auditError); }
    return NextResponse.json({ product: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося оновити товар";
    return NextResponse.json({ error: message }, { status: message === "Товар не знайдено" ? 404 : 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "Сховище товарів недоступне для запису: налаштуйте Cloudflare D1 або GITHUB_TOKEN у середовищі магазину." }, { status: 503 });
  const { id } = await context.params;
  try {
    const before = await readProducts();
    const removed = before.find((item) => item.id === id);
    if (!removed) return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
    await mutateProducts(`Admin: delete product ${id}`, (products) => products.filter((item) => item.id !== id));
    await appendActivity({ event_type: "product_deleted", entity_type: "product", entity_id: id, title: `Товар видалено: ${removed.name}`, metadata: { slug: removed.slug } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося видалити товар" }, { status: 400 });
  }
}
