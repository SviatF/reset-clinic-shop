import type { ProductRecord } from "./commerce-types";

export type CuskinImportRow = {
  sku: string; slug: string; name: string; english_name: string;
  brand: string; category: "face" | "body" | "hair" | "other";
  subcategory_slugs: string[]; product_line: string;
  price: number; size: string; short_description: string;
  description: string; how_to_use: string; inci: string;
  image_url?: string;
};
export type CuskinAction = {
  sku: string; name: string; existingId: string | null;
  kind: "create" | "enrich" | "skip" | "conflict";
  reason: string; needsPhoto: boolean;
};
const normalize = (name: string) => String(name || "")
  .toLocaleLowerCase("uk").replace(/cu\s*:?\s*skin|cuskin/g, " ")
  .replace(/[^a-zа-яіїєґ0-9]+/giu, " ").replace(/\s+/g, " ").trim();
const tokens = (name: string) => new Set(normalize(name).split(" ").filter(w => w.length > 2));

export function validateCuskinRows(raw: unknown): CuskinImportRow[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 120) throw new Error("Очікується список до 120 позицій CU SKIN");
  const seen = new Set<string>();
  return raw.map((row, i) => {
    if (!row || typeof row !== "object") throw new Error("Некоректний товар у рядку " + (i + 1));
    const r = row as Record<string, unknown>;
    const sku = String(r.sku ?? "");
    const slug = String(r.slug ?? "");
    if (!/^300\d{3}$/.test(sku) || seen.has(sku)) throw new Error("Некоректний або повторний артикул " + sku);
    seen.add(sku);
    if (!/^cuskin-300\d{3}-[a-z0-9-]{1,100}$/.test(slug)) throw new Error("Некоректний slug " + sku);
    if (r.brand !== "CU SKIN") throw new Error("Пакет містить товар іншого бренду: " + sku);
    if (!["face", "body", "hair", "other"].includes(String(r.category))) throw new Error("Некоректна категорія " + sku);
    const price = Number(r.price);
    if (!Number.isFinite(price) || price <= 0 || price > 100000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) throw new Error("Некоректна РРЦ для " + sku);
    function t(key: string, max: number) {
      const value = r[key] ?? "";
      if (typeof value !== "string" || value.length > max) throw new Error("Некоректне поле " + key + ": " + sku);
      return value.trim();
    }
    const name = t("name", 180);
    if (name.length < 6) throw new Error("Відсутня назва для " + sku);
    const subs = r.subcategory_slugs;
    if (!Array.isArray(subs) || subs.length > 10 || subs.some(x => typeof x !== "string" || x.length > 50)) throw new Error("Некоректні підкатегорії " + sku);
    return {
      sku, slug, name, english_name: t("english_name", 180),
      brand: "CU SKIN", category: r.category as CuskinImportRow["category"],
      subcategory_slugs: subs as string[], product_line: t("product_line", 120),
      price, size: t("size", 80), short_description: t("short_description", 500),
      description: t("description", 5000), how_to_use: t("how_to_use", 3000),
      inci: t("inci", 8000), image_url: t("image_url", 1200),
    };
  });
}
function sameSize(existing: ProductRecord, row: CuskinImportRow) {
  const a = String(existing.size || "").match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".");
  const b = String(row.size || "").match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".");
  return !a || !b || a === b;
}
function similar(a: string, b: string) {
  const x = tokens(a),y = tokens(b);
  const overlap = [...x].filter(t => y.has(t)).length;
  return !!Math.min(x.size, y.size) && overlap / Math.min(x.size, y.size) >= 0.78;
}
function patch(existing: ProductRecord, row: CuskinImportRow) {
  const updates: Partial<ProductRecord> = {};
  if (!existing.sku || /^CU-SKIN-\d{3}$/i.test(existing.sku)) updates.sku = row.sku;
  if (!existing.image_url && row.image_url) updates.image_url = row.image_url;
  if (!existing.description && row.description) updates.description = row.description;
  if (!existing.short_description && row.short_description) updates.short_description = row.short_description;
  if (!existing.how_to_use && row.how_to_use) updates.how_to_use = row.how_to_use;
  if (!existing.inci && row.inci) updates.inci = row.inci;
  if (!existing.product_line && row.product_line) updates.product_line = row.product_line;
  if (!existing.size && row.size) updates.size = row.size;
  if (!existing.subcategory_slugs?.length && row.subcategory_slugs.length) updates.subcategory_slugs = row.subcategory_slugs;
  if (Number(existing.price) <= 0 && row.price > 0) updates.price = row.price;
  return updates;
}

export function cuskinImportPlan(products: ProductRecord[], input: CuskinImportRow[]): CuskinAction[] {
  return input.map(row => {
    const exact = products.filter(p => p.sku === row.sku);
    if (exact.length > 1) return { sku: row.sku, name: row.name, existingId: null, kind: "conflict", reason: "Повторений артикул у D1", needsPhoto: false };
    if (exact.length === 1) {
      const p = exact[0];
      if (p.brand !== "CU SKIN" || !sameSize(p, row) || !similar(p.name, row.name))
        return { sku: row.sku, name: row.name, existingId: p.id, kind: "conflict", reason: "Артикул зайнятий іншим товаром", needsPhoto: false };
      return { sku: row.sku, name: row.name, existingId: p.id, kind: Object.keys(patch(p,row)).length ? "enrich" : "skip", reason: "Знайдено за артикулом", needsPhoto: !p.image_url };
    }
    const sameName = products.filter(p => p.brand === "CU SKIN" && sameSize(p,row) && normalize(p.name) === normalize(row.name));
    if (sameName.length > 1) return { sku: row.sku, name: row.name, existingId: null, kind: "conflict", reason: "Кілька товарів з однаковою назвою", needsPhoto: false };
    if (sameName.length === 1) {
      const p = sameName[0];
      if (p.sku && !/^CU-SKIN-\d{3}$/i.test(p.sku) && p.sku !== row.sku)
        return { sku: row.sku, name: row.name, existingId: p.id, kind: "conflict", reason: "Назва збігається, але інший справжній артикул", needsPhoto: false };
      return { sku: row.sku, name: row.name, existingId: p.id, kind: Object.keys(patch(p,row)).length ? "enrich" : "skip", reason: "Знайдено за назвою", needsPhoto: !p.image_url };
    }
    const possible = products.filter(p => p.brand === "CU SKIN" && sameSize(p,row) && similar(p.name,row.name));
    if (possible.length > 0)
      return { sku: row.sku, name: row.name, existingId: null, kind: "conflict", reason: "Можливий дубль — перевірити вручну", needsPhoto: false };
    if (products.some(p => p.slug === row.slug))
      return { sku: row.sku, name: row.name, existingId: null, kind: "conflict", reason: "Slug вже зайнятий", needsPhoto: false };
    return { sku: row.sku, name: row.name, existingId: null, kind: "create", reason: "Новий товар (чернетка)", needsPhoto: true };
  });
}
export function applyCuskinImport(products: ProductRecord[], rows: CuskinImportRow[], plan: CuskinAction[], now: string) {
  const bySku = new Map(rows.map(row=>[row.sku,row]));
  const updated = new Map<string,ProductRecord>();
  const added:ProductRecord[]=[];
  for (const action of plan) {
    const row = bySku.get(action.sku)!;
    if (action.kind === "conflict" || action.kind === "skip") continue;
    if (action.kind === "create") {
      if (!row.image_url?.startsWith("/shop-media/products/")) throw new Error("Фото не завантажене в R2 для " + row.sku);
      added.push({
        id: "cuskin_" + row.sku, slug: row.slug, name: row.name, brand: "CU SKIN",
        sku: row.sku, category: row.category, subcategory_slugs: row.subcategory_slugs,
        product_line: row.product_line || null, status: "draft",
        short_description: row.short_description, description: row.description, price: row.price,
        sale_price: null, currency: "UAH", stock_quantity: 0, track_stock: true,
        size: row.size || null, image_url: row.image_url, secondary_image_url: null,
        hover_label: "ПРИЗНАЧЕННЯ", hover_title: null, hover_text: null,
        how_to_use: row.how_to_use || null, key_ingredients: [], inci: row.inci || null,
        seo_title: null, seo_description: null, seo_keywords: [], featured: false,
        sort_order: products.length + added.length + 1, published_at: null,
        created_at: now, updated_at: now,
      });
    } else {
      const p = products.find(p=>p.id===action.existingId);
      if(!p)throw new Error("Товар було змінено, оновіть план: " + row.sku);
      const changes=patch(p,row);
      if (!p.image_url && !row.image_url?.startsWith("/shop-media/products/"))
        throw new Error("Відсутнє фото R2 для " + row.sku);
      updated.set(p.id,{...p,...changes,updated_at: now});
    }
  }
  return { products: [...products.map(p=>updated.get(p.id)||p),...added], created:added.length, enriched:updated.size };
}
