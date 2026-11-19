import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readProducts } from "@/lib/commerce-json";
import { jsonStoreWriteStatus } from "@/lib/json-store";
import { getProductPricing } from "@/lib/product-pricing";
import { readyBasketDB, initReadyBasketTable, initReadyBasketCategories, categoryStatements, readReadyBasketCategoryImages, listReadyBaskets, readyBasketResolved, type ReadyBasket, type ReadyBasketItem } from "@/lib/ready-baskets";
import { CATEGORY_KEYS } from "@/lib/ready-basket-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(payload: unknown, status = 200) {
 return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store, private" } });
}
function clean(value: unknown, max: number) {
 return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function sanitizeUrl(raw: unknown): string | null {
 const url = clean(raw, 1400);
 if (!url) return null;
 if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\"))
   return url;
 try {
  const parsed = new URL(url);
  if (parsed.protocol === "https:") return url;
 } catch {}
 throw new Error("Для фото потрібен HTTPS URL або шлях /api/media/...");
}
function validSlug(v: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v); }
function normalize(input: Record<string, unknown>, original?: ReadyBasket): ReadyBasket {
 const title = clean(input.title, 160);
 const slug = clean(input.slug, 120).toLowerCase();
 const concern = clean(input.concern, 240);
 const description = clean(input.description, 3500);
 if (!title || !slug || !validSlug(slug)) throw new Error("Вкажіть назву та slug латиницею через дефіс");
 const rawItems = input.items;
 if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 20) throw new Error("Додайте від 1 до 20 різних товарів");
 const items: ReadyBasketItem[] = rawItems.map(raw => {
  const row = raw as Record<string, unknown>;
  const productSlug = clean(row.slug, 160);
  const qty = Number(row.qty);
  if (!productSlug || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error("Некоректна кількість товарів");
  return { slug: productSlug, qty };
 });
 if (new Set(items.map(item => item.slug)).size !== items.length) throw new Error("Один товар не може повторюватися");
 const rawCategories = Array.isArray(input.categories) ? input.categories : (original?.categories || []);
 const categories = rawCategories.map(v => clean(v, 80));
 if (categories.length > CATEGORY_KEYS.size || categories.some(k => !CATEGORY_KEYS.has(k)) || new Set(categories).size !== categories.length)
   throw new Error("Неправильні категорії добірки");
 const status = input.status === "published" ? "published" : "draft";
 if (status === "published" && categories.length === 0) throw new Error("Вкажіть хоча б одну категорію за типом шкіри або запитом");
 const orderNumber = Number(input.sortOrder);
 const sortOrder = Number.isFinite(orderNumber) ? Math.max(-100000, Math.min(100000, Math.trunc(orderNumber))) : 50;
 const now = new Date().toISOString();
 return {
  id: original?.id || randomUUID(), slug, title, concern, description,
  imageUrl: sanitizeUrl(input.imageUrl), status, sortOrder,
  categories, items, createdAt: original?.createdAt || now, updatedAt: now,
 };
}
async function ensureReady() {
 const db = readyBasketDB();
 if (!db) throw new Error("D1 Binding SHOP_DB відсутній у цьому Worker");
 const storage = await jsonStoreWriteStatus();
 if (storage.backend !== "cloudflare-d1" || !storage.writable)
   throw new Error("Збереження кошиків доступне після підключення D1 магазину: SHOP_STORAGE_BACKEND=cloudflare, SHOP_PRODUCTS_BACKEND=d1 та ініціалізації каталогу");
 return db;
}
export async function GET() {
 if (!(await isAdminAuthenticated())) return respond({ error: "Unauthorized" }, 401);
 const db = readyBasketDB();
 if (!db) return respond({ configured: false, error: "Не знайдено SHOP_DB" }, 503);
 try {
  const [products, storage, categoryImages] = await Promise.all([readProducts(), jsonStoreWriteStatus(), readReadyBasketCategoryImages()]);
  let baskets: ReadyBasket[] = [];
  try { baskets = await listReadyBaskets(db); }
  catch(error) {
   if (!(error instanceof Error && /no such table|shop_ready_baskets/i.test(error.message))) throw error;
  }
  return respond({
   configured: true, writable: storage.backend === "cloudflare-d1" && storage.writable,
   categoryImages,
   storageReason: storage.reason,
   baskets: baskets.map(basket => ({
    ...basket, calculated: { total: readyBasketResolved(basket, products).total,
     count: readyBasketResolved(basket, products).count,
     available: readyBasketResolved(basket, products).available },
   })),
   products: products.map(item => ({
    slug: item.slug, name: item.name, brand: item.brand, price: getProductPricing(item).price,
    status: item.status, imageUrl: item.image_url,
    stockQuantity: Number(item.stock_quantity), trackStock: item.track_stock,
    inventoryStatus: item.inventory_status || "auto",
   })),
  });
 } catch (error) {
  console.error("Ready baskets admin GET", error);
  return respond({ error: "Не вдалося завантажити готові кошики з D1" }, 503);
 }
}
export async function POST(request: Request) {
 if (!(await isAdminAuthenticated())) return respond({ error: "Unauthorized" }, 401);
 const origin = request.headers.get("origin");
 if (!origin || origin !== new URL(request.url).origin) return respond({ error: "Invalid origin" }, 403);
 try {
  const db = await ensureReady();
  const input = await request.json() as Record<string, unknown>;
  if (input.action === "category-image") {
   const key=clean(input.categoryKey,80);
   if(!CATEGORY_KEYS.has(key))return respond({error:"Невідома категорія"},400);
   const imageUrl=sanitizeUrl(input.imageUrl);
   await initReadyBasketCategories(db);
   if(imageUrl) {
    await db.prepare("INSERT INTO shop_ready_basket_category_images(category_key,image_url,updated_at) VALUES (?,?,?) ON CONFLICT(category_key) DO UPDATE SET image_url=excluded.image_url,updated_at=excluded.updated_at")
      .bind(key,imageUrl,new Date().toISOString()).run();
   } else {
    await db.prepare("DELETE FROM shop_ready_basket_category_images WHERE category_key=?").bind(key).run();
   }
   return respond({ok:true,categoryKey:key,imageUrl});
  }
  if (input.action === "delete") {
   const id = clean(input.id, 100);
   if (!id) return respond({ error: "ID потрібен" }, 400);
   await initReadyBasketTable(db);
   await initReadyBasketCategories(db);
   await db.batch([
    db.prepare("DELETE FROM shop_ready_basket_categories WHERE basket_id = ?").bind(id),
    db.prepare("DELETE FROM shop_ready_baskets WHERE id = ?").bind(id)
   ]);
   return respond({ ok: true });
  }
  if (input.action !== "save") return respond({ error: "Unknown action" }, 400);
  await initReadyBasketTable(db);
  await initReadyBasketCategories(db);
  const id = clean(input.id, 100);
  const current = id ? (await listReadyBaskets(db)).find(row => row.id === id) : undefined;
  if (id && !current) return respond({ error: "Добірку не знайдено" }, 404);
  const next = normalize(input, current);
  const products = await readProducts();
  const bySlug = new Map(products.map(item => [item.slug,item]));
  if (next.items.some(row => !bySlug.has(row.slug))) throw new Error("У складі є товар, якого немає в каталозі");
  if (next.status === "published" && !readyBasketResolved(next, products).available)
   throw new Error("Не можна публікувати добірку з неактивним або недоступним товаром. Перевірте наявність, статус і ціну.");
  try {
   const basketWrite = db.prepare(`INSERT INTO shop_ready_baskets
     (id, slug, title, concern, description, image_url, status, sort_order, items_json, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,
       concern=excluded.concern,description=excluded.description,image_url=excluded.image_url,
       status=excluded.status,sort_order=excluded.sort_order,items_json=excluded.items_json,
       updated_at=excluded.updated_at`)
    .bind(next.id,next.slug,next.title,next.concern,next.description,next.imageUrl,next.status,
      next.sortOrder,JSON.stringify(next.items),next.createdAt,next.updatedAt);
   await db.batch([basketWrite,...categoryStatements(db,next.id,next.categories)]);
  } catch(error) {
   if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) throw new Error("Цей slug уже використовується іншою добіркою");
   throw error;
  }
  return respond({ ok: true, basket: next });
 } catch(error) {
  console.error("Ready baskets admin POST", error);
  return respond({ error: error instanceof Error ? error.message : "Не вдалося зберегти кошик" }, 400);
 }
}
