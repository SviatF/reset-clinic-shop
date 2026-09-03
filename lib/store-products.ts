import "server-only";

import productsData from "@/data/products.json";
import hairBatch1 from "@/data/hair-products-1.json";
import hairBatch2 from "@/data/hair-products-2.json";
import hairBatch3 from "@/data/hair-products-3.json";
import type { ProductRecord } from "@/lib/commerce-types";
import { PRODUCTS_PATH, readJsonStore, usingLocalJsonStore } from "@/lib/json-store";

type HairSeedSource = {
  slug: string;
  name: string;
  price: number;
  size: string | null;
  image: string | null;
  short: string;
};

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

const HAIR_IMPORTED_AT = "2026-09-03T00:00:00.000Z";
const hairSource = [...hairBatch1, ...hairBatch2, ...hairBatch3] as HairSeedSource[];

function hairHover(name: string) {
  const value = name.toLowerCase();
  if (value.includes("набір")) return ["КОМПЛЕКСНИЙ ДОГЛЯД", "Повна система", "Кілька етапів в одному наборі"] as const;
  if (value.includes("шампун")) return ["ПРИЗНАЧЕННЯ", "Очищення + догляд", "Для професійної рутини волосся"] as const;
  if (value.includes("маска") && !value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Живлення + відновлення", "Для довжини та якості волосся"] as const;
  if (value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Захист + керованість", "Незмивний догляд для волосся"] as const;
  if (value.includes("сироват")) return ["ПРИЗНАЧЕННЯ", "Блиск + захист", "Фінішний догляд без обтяження"] as const;
  if (value.includes("кондиціон")) return ["ПРИЗНАЧЕННЯ", "М’якість + розгладження", "Після очищення волосся"] as const;
  if (value.includes("віск") || value.includes("гель") || value.includes("мус") || value.includes("лак")) return ["СТАЙЛІНГ", "Форма + фіксація", "Професійний контроль укладки"] as const;
  return ["ДОГЛЯД ЗА ВОЛОССЯМ", "Професійний догляд", "OLIE'RE PARIS"] as const;
}

function hairRecord(item: HairSeedSource, index: number): ProductRecord {
  const [hoverLabel, hoverTitle, hoverText] = hairHover(item.name);
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `oliere_hair_${number}`,
    slug: item.slug,
    name: item.name,
    brand: "OLIE'RE PARIS",
    sku: `OLIERE-${number}`,
    category: "hair",
    status: "active",
    short_description: item.short,
    description: item.short,
    price: Number(item.price),
    currency: "UAH",
    stock_quantity: 0,
    track_stock: false,
    size: item.size,
    image_url: item.image,
    secondary_image_url: null,
    hover_label: hoverLabel,
    hover_title: hoverTitle,
    hover_text: hoverText,
    how_to_use: null,
    key_ingredients: [],
    inci: null,
    seo_title: `${item.name} — купити в RESET Clinic`,
    seo_description: `${item.short}. OLIE'RE PARIS у RESET Clinic з доставкою по Україні.`,
    seo_keywords: ["OLIE'RE PARIS", "професійна косметика для волосся", "догляд за волоссям"],
    featured: false,
    sort_order: index + 1,
    published_at: HAIR_IMPORTED_AT,
    created_at: HAIR_IMPORTED_AT,
    updated_at: HAIR_IMPORTED_AT,
  };
}

const seed = [
  ...(productsData as unknown as ProductRecord[]),
  ...hairSource.map(hairRecord),
];

async function rows(): Promise<ProductRecord[]> {
  if (!usingLocalJsonStore()) return seed;
  const stored = await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, seed);
  return Array.isArray(stored.data) ? stored.data : seed;
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
  const data = await rows();
  const limit = Math.max(1, Math.min(100, options.limit || 50));
  return data
    .filter((row) => row.status === "active")
    .filter((row) => !options.category || row.category === options.category)
    .filter((row) => options.featured === undefined || row.featured === options.featured)
    .sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map(mapRecord);
}

export async function getStoreProductBySlug(slug: string) {
  const data = await rows();
  const row = data.find((item) => item.slug === slug && item.status === "active");
  return row ? mapRecord(row) : null;
}
