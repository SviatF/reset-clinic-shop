import type { ProductRecord } from "./commerce-types";

export type PublishItem = {
  id: string;
  name: string;
  brand: string;
  status: ProductRecord["status"];
  imageUrl: string | null;
  price: number;
  stock: number;
  tracksStock: boolean;
  eligible: boolean;
  reason: string | null;
  zeroStock: boolean;
  catalogOnly: boolean;
};

/** Check status, official photo URL and price. Zero stock is explicitly
 * disclosed, but is not silently replaced with fictional stock counts. */
export function planCatalogPublishing(raw: ProductRecord[], effective: ProductRecord[], ids: string[], options:{allowUnpriced?:boolean}={}): PublishItem[] {
  const byId = new Map(effective.map(row => [row.id, row]));
  const rawById = new Map(raw.map(row => [row.id, row]));
  return ids.map(id => {
    const product = byId.get(id);
    const original = rawById.get(id);
    if (!product || !original || product.slug === "parsley-seed-anti-oxidant-eye-cream")
      return { id, name: "Невідомий товар", brand: "", status: "draft" as const,
        imageUrl: null, price: 0, stock: 0, tracksStock: false,
        eligible: false, reason: "Товар не знайдено", zeroStock: false, catalogOnly: false };
    const price = Number(original.price);
    const stock = Number(original.stock_quantity) || 0;
    const zeroStock = stock <= 0 && original.track_stock === true;
    const photo = String(product.image_url || "").trim();
    let reason: string | null = null;
    if (original.status !== "draft") reason = "Товар не у статусі чернетки";
    else if (!photo) reason = "Немає фотографії товару";
    else if (!Number.isFinite(price) || price < 0 || (price === 0 && !options.allowUnpriced))
      reason = "Не вказано коректну ціну";
    return { id, name: product.name, brand: product.brand, status: original.status,
      imageUrl: photo || null, price, stock, tracksStock: original.track_stock === true,
      eligible: !reason, reason, zeroStock, catalogOnly: !reason && price===0 };
  });
}

export function publishCatalogRows(raw: ProductRecord[], effective: ProductRecord[], ids: string[], now: string, options:{allowUnpriced?:boolean}={}) {
  const plan = planCatalogPublishing(raw,effective,ids,options);
  const eligible = new Map(plan.filter(row => row.eligible).map(row => [row.id,row]));
  const next = raw.map(row => {
    const item = eligible.get(row.id);
    if (!item) return row;
    // Persist a previously verified bundled photo if D1 lacks its URL.
    const image_url = row.image_url || item.imageUrl;
    return { ...row, image_url, status: "active" as const,
      published_at: row.published_at || now, updated_at: now };
  });
  return { products: next, updatedCount: eligible.size, preview: plan };
}
