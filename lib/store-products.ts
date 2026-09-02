import "server-only";

import productsData from "@/data/products.json";
import type { ProductRecord } from "@/lib/commerce-types";

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
  updatedAt: string;
};

function rows(): ProductRecord[] {
  return productsData as unknown as ProductRecord[];
}

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
    updatedAt: row.updated_at,
  };
}

export async function getAllProductRecords() {
  return rows();
}

export async function getStoreProducts(options: { category?: string; featured?: boolean; limit?: number } = {}) {
  const limit = Math.max(1, Math.min(100, options.limit || 50));
  return rows()
    .filter((row) => row.status === "active")
    .filter((row) => !options.category || row.category === options.category)
    .filter((row) => options.featured === undefined || row.featured === options.featured)
    .sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map(mapRecord);
}

export async function getStoreProductBySlug(slug: string) {
  const row = rows().find((item) => item.slug === slug && item.status === "active");
  return row ? mapRecord(row) : null;
}
