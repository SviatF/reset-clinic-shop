import type { ProductRecord } from "./commerce-types";

/**
 * Bulk promotions are deliberately materialized to the existing per-product
 * sale_price field. This keeps prices consistent across catalog, cart,
 * checkout and individual product editing with no new campaign priority rules.
 */
export type BulkPromotionFilters = {
  brand: string;
  category: string;
  subcategory: string;
  productLine: string;
  status: "active" | "draft" | "archived" | "all";
  query: string;
  allProducts: boolean;
};
export type BulkPromotionInput = {
  action: "apply" | "remove";
  percent: number;
  overwriteExisting: boolean;
  filters: BulkPromotionFilters;
};
export type PromotionRow = {
  id: string;
  name: string;
  brand: string;
  sku: string;
  status: string;
  originalPrice: number;
  currentPrice: number;
  proposedPrice: number;
  savedAmount: number;
  eligible: boolean;
  reason: string | null;
};
export type BulkPromotionPlan = {
  input: BulkPromotionInput;
  rows: PromotionRow[];
  matchedCount: number;
  eligibleCount: number;
  skippedCount: number;
};

/** Reject broad, accidental or malformed requests rather than silently widening scope. */
export function normalizeBulkPromotionInput(raw: unknown): BulkPromotionInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Некоректні параметри масової акції");
  const body = raw as Record<string, unknown>;
  const source = body.filters;
  if (!source || typeof source !== "object" || Array.isArray(source))
    throw new Error("Виберіть фільтри товарів");
  const filter = source as Record<string, unknown>;
  function field(name: string, max: number) {
    const value = filter[name] ?? "";
    if (typeof value !== "string" || value.length > max) throw new Error("Некоректний фільтр: " + name);
    return value.trim();
  }
  const brand = field("brand", 120);
  const category = field("category", 12);
  const subcategory = field("subcategory", 80);
  const productLine = field("productLine", 120);
  const query = field("query", 120);
  const status = filter.status ?? "active";
  const allProducts = filter.allProducts === true;
  if (!["", "face", "body", "hair", "other"].includes(category)) throw new Error("Некоректна категорія");
  if (!["active", "draft", "archived", "all"].includes(String(status)))
    throw new Error("Некоректний статус");
  if (typeof filter.allProducts !== "undefined" && typeof filter.allProducts !== "boolean")
    throw new Error("Некоректний параметр усього каталогу");
  if (subcategory && !category) throw new Error("Для підкатегорії спочатку виберіть категорію");
  if (!brand && !category && !productLine && !query && !allProducts)
    throw new Error("Вкажіть хоча б бренд, категорію, лінійку або пошук. Для всього каталогу окремо підтвердьте цей вибір.");
  if (body.action !== "apply" && body.action !== "remove") throw new Error("Виберіть дію зі знижками");
  if (body.overwriteExisting !== undefined && typeof body.overwriteExisting !== "boolean")
    throw new Error("Некоректний режим перезапису");
  const percent = body.action === "remove" ? 0 : Number(body.percent);
  if (body.action === "apply" &&
      (!Number.isFinite(percent) || percent < 0.1 || percent > 99.9 ||
      Math.abs(percent * 100 - Math.round(percent * 100)) > 1e-6))
    throw new Error("Знижка повинна бути від 0,1% до 99,9% (до двох знаків після коми)");
  return {
    action: body.action,
    percent,
    overwriteExisting: body.overwriteExisting === true,
    filters: { brand, category, subcategory, productLine, status: status as BulkPromotionFilters["status"], query, allProducts },
  };
}

function centsOf(value: unknown): number {
  const raw = Number(value);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) : 0;
}
function money(cents: number) { return cents / 100; }

export function matchesPromotionFilters(product: ProductRecord, f: BulkPromotionFilters): boolean {
  if (product.slug === "parsley-seed-anti-oxidant-eye-cream") return false;
  if (f.brand && product.brand !== f.brand) return false;
  if (f.category && product.category !== f.category) return false;
  if (f.subcategory && !(product.subcategory_slugs || []).includes(f.subcategory)) return false;
  if (f.productLine && String(product.product_line || "") !== f.productLine) return false;
  if (f.status !== "all" && product.status !== f.status) return false;
  if (f.query) {
    const needle = f.query.toLocaleLowerCase("uk");
    if (![product.name, product.sku, product.slug, product.brand, product.product_line]
      .some(value => String(value || "").toLocaleLowerCase("uk").includes(needle))) return false;
  }
  return true;
}

/** Only the sale_price field will be written; all other fields are preserved. */
export function buildBulkPromotionPlan(products: ProductRecord[], input: BulkPromotionInput): BulkPromotionPlan {
  const matched = products.filter(p => matchesPromotionFilters(p, input.filters));
  if (matched.length > 500) throw new Error("Занадто багато товарів для однієї операції (максимум 500)");
  const rows: PromotionRow[] = matched.map(product => {
    const regular = centsOf(product.price);
    const rawSale = product.sale_price === null || product.sale_price === undefined ? null : centsOf(product.sale_price);
    const existingSale = rawSale !== null && rawSale > 0 && rawSale < regular;
    const current = existingSale ? rawSale! : regular;
    let proposed = current;
    let reason: string | null = null;
    if (input.action === "remove") {
      if (!existingSale) reason = "Немає активної знижки";
      else proposed = regular;
    } else if (regular <= 1) {
      reason = "Ціна замала для знижки";
    } else if (existingSale && !input.overwriteExisting) {
      reason = "Є індивідуальна знижка";
    } else {
      const discounted = Math.round(regular * (100 - input.percent) / 100);
      if (discounted < 1 || discounted >= regular) reason = "Знижка не формує коректну ціну";
      else if (discounted === current) reason = "Така ціна вже встановлена";
      else proposed = discounted;
    }
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku || "",
      status: product.status,
      originalPrice: money(regular),
      currentPrice: money(current),
      proposedPrice: money(proposed),
      savedAmount: input.action === "apply" && !reason ? money(regular - proposed) : 0,
      eligible: reason === null,
      reason,
    };
  });
  return {
    input,
    rows,
    matchedCount: rows.length,
    eligibleCount: rows.filter(r => r.eligible).length,
    skippedCount: rows.filter(r => !r.eligible).length,
  };
}

/** Fingerprint only mutable fields relevant to matched products and selection. */
export function promotionSnapshot(products: ProductRecord[], input: BulkPromotionInput) {
  return JSON.stringify({
    input,
    matched: products.filter(p => matchesPromotionFilters(p, input.filters))
      .map(p => [p.id, p.slug, p.name, p.sku, p.brand, p.category, p.subcategory_slugs,
        p.product_line, p.status, p.price, p.sale_price, p.updated_at])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  });
}

export function applyBulkPromotionPlan(products: ProductRecord[], plan: BulkPromotionPlan, excludedIds: string[], now: string) {
  const excluded = new Set(excludedIds);
  const eligible = new Map(plan.rows.filter(row => row.eligible && !excluded.has(row.id)).map(row => [row.id, row]));
  let updatedCount = 0;
  const next = products.map(product => {
    const row = eligible.get(product.id);
    if (!row) return product;
    updatedCount += 1;
    return { ...product, sale_price: plan.input.action === "remove" ? null : row.proposedPrice, updated_at: now };
  });
  return { products: next, updatedCount };
}
