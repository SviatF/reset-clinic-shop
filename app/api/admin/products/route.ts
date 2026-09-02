import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ProductRecord } from "@/lib/commerce-types";
import { appendActivity, mutateProducts, newId, readProducts } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function normalizeProduct(body: any, id: string, createdAt: string): ProductRecord {
  const name = clean(body?.name, 180);
  if (!name) throw new Error("Назва товару обов’язкова");
  const slug = slugify(clean(body?.slug, 140) || name);
  if (!slug) throw new Error("Не вдалося сформувати slug");
  const status: ProductRecord["status"] = ["draft", "active", "archived"].includes(body?.status) ? body.status : "draft";
  const category: ProductRecord["category"] = ["face", "body", "hair", "other"].includes(body?.category) ? body.category : "face";
  const now = new Date().toISOString();
  return {
    id,
    slug,
    name,
    brand: clean(body?.brand, 120) || "RESET Clinic",
    sku: clean(body?.sku, 120) || null,
    category,
    status,
    short_description: clean(body?.short_description, 500),
    description: clean(body?.description, 5000),
    price: Math.max(0, Number(body?.price) || 0),
    currency: "UAH",
    stock_quantity: Math.max(0, Math.trunc(Number(body?.stock_quantity) || 0)),
    track_stock: body?.track_stock !== false,
    size: clean(body?.size, 80) || null,
    image_url: clean(body?.image_url, 1200) || null,
    secondary_image_url: clean(body?.secondary_image_url, 1200) || null,
    hover_label: clean(body?.hover_label, 60) || "ПРИЗНАЧЕННЯ",
    hover_title: clean(body?.hover_title, 160) || null,
    hover_text: clean(body?.hover_text, 220) || null,
    how_to_use: clean(body?.how_to_use, 3000) || null,
    key_ingredients: Array.isArray(body?.key_ingredients) ? body.key_ingredients.map((v: unknown) => clean(v, 120)).filter(Boolean).slice(0, 30) : [],
    inci: clean(body?.inci, 8000) || null,
    seo_title: clean(body?.seo_title, 180) || null,
    seo_description: clean(body?.seo_description, 320) || null,
    seo_keywords: Array.isArray(body?.seo_keywords) ? body.seo_keywords.map((v: unknown) => clean(v, 100)).filter(Boolean).slice(0, 30) : [],
    featured: Boolean(body?.featured),
    sort_order: Math.trunc(Number(body?.sort_order) || 0),
    published_at: status === "active" ? now : null,
    created_at: createdAt,
    updated_at: now,
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const products = (await readProducts()).sort((a, b) => a.sort_order - b.sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ configured: true, writable: jsonStoreWriteConfigured(), products });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "JSON read error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN не налаштований" }, { status: 503 });
  try {
    const body = await request.json();
    const id = newId("product");
    const now = new Date().toISOString();
    const product = normalizeProduct(body, id, now);
    await mutateProducts(`Admin: add product ${product.slug}`, (products) => {
      if (products.some((item) => item.slug === product.slug)) throw new Error("Товар з таким slug вже існує");
      return [...products, product];
    });
    await appendActivity({ event_type: "product_created", entity_type: "product", entity_id: product.id, title: `Створено товар: ${product.name}`, metadata: { slug: product.slug, status: product.status, price: product.price } });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося створити товар" }, { status: 400 });
  }
}
