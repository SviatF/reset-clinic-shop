import "server-only";

import { product as fallbackProduct } from "@/lib/product";
import type { ProductRecord } from "@/lib/commerce-types";
import { dbSelect, isSupabaseConfigured } from "@/lib/supabase-rest";

export type StoreProduct = {
  id: string | null;
  slug: string;
  name: string;
  brand: string;
  category: "face" | "body" | "hair" | "other";
  price: number;
  currency: string;
  stockQuantity: number;
  trackStock: boolean;
  size: string;
  imageUrl: string | null;
  secondaryImageUrl: string | null;
  shortDescription: string;
  description: string;
  hoverLabel: string;
  hoverTitle: string;
  hoverText: string;
  howToUse: string;
  keyIngredients: string[];
  inci: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
};

function mapRecord(row: ProductRecord): StoreProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: Number(row.price || 0),
    currency: row.currency || "UAH",
    stockQuantity: Number(row.stock_quantity || 0),
    trackStock: row.track_stock,
    size: row.size || "",
    imageUrl: row.image_url,
    secondaryImageUrl: row.secondary_image_url,
    shortDescription: row.short_description || row.description || "",
    description: row.description || row.short_description || "",
    hoverLabel: row.hover_label || "ПРИЗНАЧЕННЯ",
    hoverTitle: row.hover_title || row.short_description || "Професійний догляд",
    hoverText: row.hover_text || row.size || row.brand,
    howToUse: row.how_to_use || "",
    keyIngredients: row.key_ingredients || [],
    inci: row.inci || "",
    seoTitle: row.seo_title || row.name,
    seoDescription: row.seo_description || row.description || row.short_description || "",
    featured: row.featured,
  };
}

export function fallbackStoreProduct(): StoreProduct {
  return {
    id: null,
    slug: fallbackProduct.slug,
    name: fallbackProduct.name,
    brand: "Aesop",
    category: "face",
    price: fallbackProduct.price,
    currency: "UAH",
    stockQuantity: 20,
    trackStock: true,
    size: fallbackProduct.size,
    imageUrl: null,
    secondaryImageUrl: null,
    shortDescription: fallbackProduct.description,
    description: fallbackProduct.description,
    hoverLabel: "ПРИЗНАЧЕННЯ",
    hoverTitle: "Зволоження + антиоксидантний догляд",
    hoverText: "Для делікатної зони навколо очей",
    howToUse: fallbackProduct.howToUse,
    keyIngredients: fallbackProduct.keyIngredients,
    inci: fallbackProduct.inci,
    seoTitle: fallbackProduct.name,
    seoDescription: fallbackProduct.description,
    featured: true,
  };
}

export async function getStoreProducts(options: { category?: string; featured?: boolean; limit?: number } = {}) {
  if (!isSupabaseConfigured()) return [fallbackStoreProduct()];
  try {
    const query = ["select=*"]; 
    query.push("status=eq.active");
    if (options.category) query.push(`category=eq.${encodeURIComponent(options.category)}`);
    if (options.featured) query.push("featured=eq.true");
    query.push("order=sort_order.asc,created_at.desc");
    query.push(`limit=${Math.max(1, Math.min(100, options.limit || 50))}`);
    const rows = await dbSelect<ProductRecord>("products", query.join("&"));
    return rows.map(mapRecord);
  } catch (error) {
    console.error("store products fallback", error);
    return [fallbackStoreProduct()];
  }
}

export async function getStoreProductBySlug(slug: string) {
  if (!isSupabaseConfigured()) return slug === fallbackProduct.slug ? fallbackStoreProduct() : null;
  try {
    const rows = await dbSelect<ProductRecord>("products", `select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`);
    return rows?.[0] ? mapRecord(rows[0]) : null;
  } catch {
    return slug === fallbackProduct.slug ? fallbackStoreProduct() : null;
  }
}
