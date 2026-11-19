import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ProductRecord } from "@/lib/commerce-types";
import { getProductPricing } from "@/lib/product-pricing";

export type ReadyBasketStatus = "draft" | "published";
export type ReadyBasketItem = { slug: string; qty: number };
export type ReadyBasket = {
  id: string; slug: string; title: string; concern: string; description: string;
  imageUrl: string | null; status: ReadyBasketStatus; sortOrder: number;
  items: ReadyBasketItem[]; createdAt: string; updatedAt: string;
};
type Statement = {
 bind(...values: unknown[]): Statement;
 first<T>(): Promise<T | null>;
 all<T>(): Promise<{ results: T[] }>;
 run(): Promise<{ meta?: { changes?: number } }>;
};
type D1 = { prepare(sql: string): Statement };
type DBRow = {
 id: string; slug: string; title: string; concern: string; description: string;
 image_url: string | null; status: string; sort_order: number;
 items_json: string; created_at: string; updated_at: string;
};
const TABLE = "shop_ready_baskets";
const SCHEMA = `CREATE TABLE IF NOT EXISTS ${TABLE} (
 id TEXT PRIMARY KEY NOT NULL,
 slug TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 concern TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '',
 image_url TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 sort_order INTEGER NOT NULL DEFAULT 50,
 items_json TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
)`;
export function readyBasketDB(): D1 | null {
 try {
  const env = getCloudflareContext().env as unknown as { SHOP_DB?: D1 };
  return env.SHOP_DB || null;
 } catch { return null; }
}
export async function initReadyBasketTable(db: D1) {
 await db.prepare(SCHEMA).run();
}
function rowToBasket(row: DBRow): ReadyBasket {
 const items: ReadyBasketItem[] = JSON.parse(row.items_json);
 if (!Array.isArray(items)) throw new Error("INVALID_BASKET_ITEMS");
 return {
  id: row.id, slug: row.slug, title: row.title, concern: row.concern, description: row.description,
  imageUrl: row.image_url, status: row.status === "published" ? "published" : "draft",
  sortOrder: row.sort_order, items, createdAt: row.created_at, updatedAt: row.updated_at,
 };
}
export async function listReadyBaskets(db: D1): Promise<ReadyBasket[]> {
 const response = await db.prepare(
  `SELECT * FROM ${TABLE} ORDER BY sort_order ASC, created_at DESC`
 ).all<DBRow>();
 return response.results.map(rowToBasket);
}
export async function readReadyBaskets(): Promise<ReadyBasket[]> {
 const db = readyBasketDB();
 if (!db) return [];
 try { return await listReadyBaskets(db); }
 catch (error) {
  if (error instanceof Error && /no such table|D1_ERROR.*shop_ready_baskets|SQLITE_ERROR.*shop_ready_baskets/i.test(error.message)) return [];
  throw error;
 }
}
export async function readPublishedReadyBaskets() {
 return (await readReadyBaskets()).filter(item => item.status === "published");
}
export function readyBasketResolved(basket: ReadyBasket, catalog: ProductRecord[]) {
 const bySlug = new Map(catalog.filter(row => row.status === "active").map(row => [row.slug, row]));
 const entries = basket.items.map(entry => {
  const product = bySlug.get(entry.slug);
  const price = product ? getProductPricing(product).price : 0;
  const available = Boolean(product && price > 0 && product.inventory_status !== "out_of_stock"
    && product.inventory_status !== "unknown"
    && (!product.track_stock || Number(product.stock_quantity) >= entry.qty));
  return { slug: entry.slug, qty: entry.qty, product: product || null, price, available };
 });
 return {
  ...basket,
  products: entries,
  count: entries.reduce((total, item) => total + item.qty, 0),
  total: Math.round(entries.reduce((total, item) => total + item.price * item.qty, 0) * 100) / 100,
  available: entries.length > 0 && entries.every(item => item.available),
 };
}
