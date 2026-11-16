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
  candidates?: CuskinCandidate[];
};
export type CuskinCandidate = {
  id: string; name: string; sku: string | null; size: string | null;
  price: number; hasPhoto: boolean;
};
export type CuskinResolution = {
  sku: string; kind: "link" | "create"; existingId?: string; confirmDistinct?: boolean;
};

/**
 * Variant-aware product identity. A supplier article is canonical; names are
 * only supporting evidence. Generic collection names (DR. SOLUTION, CLEAN-UP)
 * must never be sufficient to declare two products the same.
 */
const normalized = (value: unknown) => String(value || "")
  .normalize("NFKC").toLocaleLowerCase("uk").replace(/cuskin|cu\s*:?\s*skin/gu, " ")
  .replace(/(\d+)[,](\d+)/gu, "$1.$2")
  .replace(/[^a-zа-яіїєґ0-9.%№#]+/giu, " ")
  .replace(/\s+/gu, " ").trim();
const ignoredWords = new Set([
  "cu","skin","cuskin","dr","solution","clean","up","av","free","vitamin","u",
  "the","for","with","and","of","new","бестселер","bestseller","новинка",
  "немає","наявності","доступний","набір","mini","міні","шт",
]);
const relevantTokens = (name: unknown): Set<string> => {
  const all = normalized(name).match(/[a-zа-яіїєґ0-9]+(?:\.[0-9]+)?/giu) || [];
  return new Set(all.filter(token => token.length > 1 && !ignoredWords.has(token)));
};
function sameSet<T>(a: Set<T>, b: Set<T>) {
  return a.size === b.size && [...a].every(value => b.has(value));
}
function percentages(value: unknown) {
  return new Set([...normalized(value).matchAll(/(\d+(?:\.\d+)?)\s*%/gu)]
    .map(match => String(Number(match[1]))));
}
function spf(value: unknown): number | null {
  const match = normalized(value).match(/spf\s*(\d{1,3})/u);
  return match ? Number(match[1]) : null;
}
function shade(value: unknown): string | null {
  const match = normalized(value).match(/(?:№|#|no\.?|shade|tone|тон|відтінок)\s*(\d{1,3})/u)
    || normalized(value).match(/cushion\s*(\d{2})/u);
  return match ? String(Number(match[1])) : null;
}
function pa(value: unknown): number | null {
  // Keep + signs: the generic name normalizer intentionally strips punctuation.
  const match = String(value || "").toLocaleLowerCase("uk").match(/pa\s*(\+{1,4})/u);
  return match ? match[1].length : null;
}
const unitMap: Record<string,string> = {
  "ml":"ml","мл":"ml","l":"l","л":"l","g":"g","г":"g","гр":"g",
  "kg":"kg","кг":"kg","pcs":"pcs","шт":"pcs",
};
function sizeParts(value: unknown) {
  const parts = [...normalized(value).matchAll(/(\d+(?:\.\d+)?)\s*(мл|ml|гр|г|g|кг|kg|шт|pcs|л|l)(?![a-zа-яіїєґ])/giu)]
    .map(match => unitMap[match[2]] + ":" + Number(match[1]));
  return [...new Set(parts)].sort();
}
function sizeStatus(existing: ProductRecord, row: CuskinImportRow): "equal" | "different" | "unknown" {
  const a = sizeParts(existing.size), b = sizeParts(row.size);
  if (!a.length || !b.length) return "unknown";
  return a.join("|") === b.join("|") ? "equal" : "different";
}
function sameSize(existing: ProductRecord, row: CuskinImportRow) {
  return sizeStatus(existing,row) !== "different";
}
const useLocation = ["eye","lip","hand"] as const;
const formWords = new Set(["cream","serum","ampoule","toner","lotion","shampoo","treatment",
  "powder","mask","gel","foam","cleanser","balm","peeling","pad","wash"]);
const distinctFormats = ["sachet","bb","cc","sun","cushion"] as const;
function conflictingVariants(existing: ProductRecord, row: CuskinImportRow): string | null {
  if (sizeStatus(existing,row) === "different") return "Інший об'єм або фасування";
  const aPercent = percentages(existing.name), bPercent = percentages(row.name);
  if (aPercent.size && bPercent.size && !sameSet(aPercent,bPercent))
    return "Інша концентрація активних компонентів";
  const aSpf = spf(existing.name), bSpf = spf(row.name);
  if (aSpf !== null && bSpf !== null && aSpf !== bSpf) return "Інший SPF";
  const aPa = pa(existing.name), bPa = pa(row.name);
  if (aPa !== null && bPa !== null && aPa !== bPa) return "Інший ступінь PA";
  const aShade = shade(existing.name), bShade = shade(row.name);
  if (aShade !== null && bShade !== null && aShade !== bShade) return "Інший відтінок";
  const x = relevantTokens(existing.name), y = relevantTokens(row.name);
  if (useLocation.some(word => x.has(word) !== y.has(word))) return "Інша зона застосування";
  if (distinctFormats.some(word => x.has(word) !== y.has(word))) return "Інший формат або тип засобу";
  const aForms = new Set([...x].filter(word => formWords.has(word)));
  const bForms = new Set([...y].filter(word => formWords.has(word)));
  if (aForms.size && bForms.size && ![...aForms].some(word => bForms.has(word)))
    return "Інший тип засобу";
  return null;
}
function sameProductName(a: string, b: string) {
  // Cosmetic collection prefixes, spacing and marketing callouts are not
  // discriminating. Retain all concentrations, model codes and shade numbers.
  const x = relevantTokens(a), y = relevantTokens(b);
  return x.size >= 2 && sameSet(x,y);
}
function similar(a: string, b: string) {
  const x = relevantTokens(a), y = relevantTokens(b);
  const shared = [...x].filter(word => y.has(word)).length;
  return shared >= 2 && shared / new Set([...x,...y]).size >= 0.63;
}
function candidateMatch(existing: ProductRecord, row: CuskinImportRow) {
  return existing.brand === "CU SKIN" &&
    !conflictingVariants(existing,row) &&
    (sameProductName(existing.name,row.name) || similar(existing.name,row.name));
}
/** Automated name-based links additionally require a known and matching size;
 * names alone cannot disambiguate 7ml miniatures from full-size products. */
function safeAutomaticMatch(existing: ProductRecord, row: CuskinImportRow) {
  const sameIdentity = sameProductName(existing.name,row.name);
  const existingHasNoRealSku = !existing.sku || /^CU-SKIN-\d{3}$/i.test(existing.sku);
  return sameIdentity && existingHasNoRealSku && sizeStatus(existing,row) === "equal"
    && !conflictingVariants(existing,row);
}

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

function candidate(product: ProductRecord): CuskinCandidate {
  return { id: product.id, name: product.name, sku: product.sku,
    size: product.size, price: Number(product.price), hasPhoto: Boolean(product.image_url) };
}

export function cuskinImportPlan(products: ProductRecord[], input: CuskinImportRow[]): CuskinAction[] {
  const planned = input.map(row => {
    // Real 6-digit article ID is authoritative. If a stored record with this
    // SKU disagrees in volume, concentration or formula, require intervention.
    const exact = products.filter(p => p.sku === row.sku);
    if (exact.length > 1) return { sku: row.sku, name: row.name, existingId: null,
      kind: "conflict" as const, reason: "Повторений артикул у D1", needsPhoto: false,
      candidates: exact.map(candidate).slice(0, 8) };
    if (exact.length === 1) {
      const p = exact[0];
      const variant = conflictingVariants(p,row);
      if (p.brand !== "CU SKIN" || variant || !candidateMatch(p,row))
        return { sku: row.sku, name: row.name, existingId: p.id, kind: "conflict" as const,
          reason: variant || "Артикул зайнятий іншим товаром", needsPhoto: false,
          candidates: [candidate(p)] };
      return { sku: row.sku, name: row.name, existingId: p.id,
        kind: (!p.image_url || Object.keys(patch(p,row)).length) ? "enrich" as const : "skip" as const,
        reason: "Підтверджений артикул", needsPhoto: !p.image_url };
    }

    const matches = products.filter(p => candidateMatch(p,row));
    if (matches.length === 1) {
      const p = matches[0];
      // No silent linking when a legacy SKU/size is unknown or the title
      // matches only approximately. Let the admin confirm the identity.
      if (safeAutomaticMatch(p,row))
        return { sku: row.sku, name: row.name, existingId: p.id,
          kind: (!p.image_url || Object.keys(patch(p,row)).length) ? "enrich" as const : "skip" as const,
          reason: "Підтверджено назву, формулу й об'єм", needsPhoto: !p.image_url };
      return { sku: row.sku, name: row.name, existingId: null, kind: "conflict" as const,
        reason: sizeStatus(p,row)==="unknown"
          ? "Можливий збіг, але в D1 не вказано об'єм — перевірте вручну"
          : "Схожий товар або інший артикул — перевірте вручну",
        needsPhoto: false, candidates: [candidate(p)] };
    }
    if (matches.length > 1)
      return { sku: row.sku, name: row.name, existingId: null, kind: "conflict" as const,
        reason: "Кілька близьких товарів — потрібне підтвердження", needsPhoto: false,
        candidates: matches.map(candidate).slice(0, 8) };

    const occupied = products.filter(p => p.slug === row.slug);
    if (occupied.length)
      return { sku: row.sku, name: row.name, existingId: null, kind: "conflict" as const,
        reason: "Slug вже зайнятий", needsPhoto: false, candidates: occupied.map(candidate) };
    return { sku: row.sku, name: row.name, existingId: null,
      kind: "create" as const, reason: "Окремий товар (чернетка)", needsPhoto: true };
  });

  // An old product with missing metadata can look like several SKU variants.
  // Never let two source SKUs silently overwrite the same existing record.
  const collisions = new Map<string, number>();
  for (const action of planned) {
    if (action.existingId && (action.kind === "enrich" || action.kind === "skip"))
      collisions.set(action.existingId, (collisions.get(action.existingId) || 0) + 1);
  }
  return planned.map(action => {
    if (!action.existingId || (collisions.get(action.existingId) || 0) <= 1 ||
        (action.kind !== "enrich" && action.kind !== "skip")) return action;
    const existing = products.find(p => p.id === action.existingId);
    return { ...action, kind: "conflict" as const, existingId: null,
      reason: "Кілька артикулів відповідають одному товару в D1",
      needsPhoto: false, candidates: existing ? [candidate(existing)] : [] };
  });
}

/** Explicit per-SKU review of ambiguous matches. Never infer a new SKU from a
 * similar product without human approval, and never overwrite real existing SKUs. */
export function resolveCuskinConflicts(
  products: ProductRecord[],
  input: CuskinImportRow[],
  originalPlan: CuskinAction[],
  rawResolutions: unknown,
): CuskinAction[] {
  if (!Array.isArray(rawResolutions) || rawResolutions.length > 120)
    throw new Error("Некоректний список підтверджень");
  const decisions = new Map<string, CuskinResolution>();
  for (const raw of rawResolutions) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Некоректне підтвердження товару");
    const r = raw as CuskinResolution;
    if (typeof r.sku !== "string" || !/^300\d{3}$/.test(r.sku) ||
      (r.kind !== "link" && r.kind !== "create") || decisions.has(r.sku))
      throw new Error("Повторний або некоректний вибір товару");
    decisions.set(r.sku, r);
  }
  const rowBySku = new Map(input.map(row => [row.sku, row]));
  const conflictingSku = new Set(originalPlan.filter(p => p.kind === "conflict").map(p => p.sku));
  for (const sku of decisions.keys()) {
    if (!rowBySku.has(sku)) throw new Error("Не знайдено товар " + sku);
    if (!conflictingSku.has(sku)) throw new Error("Додаткове підтвердження для цього SKU не потрібне");
  }
  const alreadyLinked = new Set<string>(
    originalPlan.filter(a => (a.kind === "enrich" || a.kind === "skip") && a.existingId)
      .map(a => a.existingId as string),
  );
  return originalPlan.map(action => {
    const decision = decisions.get(action.sku);
    if (!decision) return action;
    if (action.kind !== "conflict") throw new Error("Додаткове підтвердження для цього SKU не потрібне");
    const row = rowBySku.get(action.sku);
    if (!row) throw new Error("Не знайдено товар " + action.sku);
    if (decision.kind === "link") {
      if (typeof decision.existingId !== "string" ||
        !action.candidates?.some(p => p.id === decision.existingId))
        throw new Error("Оберіть запропонований товар для " + action.sku);
      const existing = products.find(p => p.id === decision.existingId);
      if (!existing || existing.brand !== "CU SKIN" || !candidateMatch(existing,row))
        throw new Error("Неможливо безпечно зв’язати " + action.sku + ": назва, бренд або об’єм не збігаються");
      if (existing.sku && !/^CU-SKIN-\d{3}$/i.test(existing.sku) && existing.sku !== row.sku)
        throw new Error("Неможливо замінити інший справжній артикул у " + action.sku);
      if (alreadyLinked.has(existing.id)) throw new Error("Один товар не можна прив'язати до кількох артикулів: " + action.sku);
      alreadyLinked.add(existing.id);
      return { ...action, kind: "enrich", existingId: existing.id,
        reason: "Підтверджено вручну: доповнити існуючий товар",
        needsPhoto: !existing.image_url };
    }
    // Explicit distinct-product confirmation is mandatory, even for familiar names.
    if (decision.confirmDistinct !== true)
      throw new Error("Підтвердьте, що " + action.sku + " — це окремий товар");
    if (products.some(p => p.sku === row.sku || p.slug === row.slug))
      throw new Error("Артикул або slug уже зайнятий: " + row.sku);
    if (products.some(p => p.brand === "CU SKIN" &&
      sizeStatus(p,row) === "equal" && sameProductName(p.name,row.name) && !conflictingVariants(p,row)))
      throw new Error("Повний збіг назви й об’єму: " + row.sku + ". Такий товар не можна створити вдруге");
    return { ...action, kind: "create", existingId: null,
      reason: "Підтверджено вручну: це інший товар", needsPhoto: true };
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
