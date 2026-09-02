import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ProductRecord } from "@/lib/commerce-types";
import { dbInsert, dbSelect, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeProduct(body: any) {
  const name = clean(body?.name, 180);
  if (!name) throw new Error("Назва товару обов’язкова");
  const slug = slugify(clean(body?.slug, 140) || name);
  if (!slug) throw new Error("Не вдалося сформувати slug");
  const price = Math.max(0, Number(body?.price) || 0);
  const stock = Math.max(0, Math.trunc(Number(body?.stock_quantity) || 0));
  const category = ["face", "body", "hair", "other"].includes(body?.category) ? body.category : "face";
  const status = ["draft", "active", "archived"].includes(body?.status) ? body.status : "draft";

  return {
    slug,
    name,
    brand: clean(body?.brand, 120) || "RESET Clinic",
    sku: clean(body?.sku, 120) || null,
    category,
    status,
    short_description: clean(body?.short_description, 500),
    description: clean(body?.description, 5000),
    price,
    currency: "UAH",
    stock_quantity: stock,
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
    published_at: status === "active" ? new Date().toISOString() : null,
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false, products: [] });

  try {
    const products = await dbSelect<ProductRecord>("products", "select=*&order=sort_order.asc,created_at.desc");
    return NextResponse.json({ configured: true, products });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ще не підключений" }, { status: 503 });

  try {
    const payload = normalizeProduct(await request.json());
    const product = await dbInsert<ProductRecord>("products", payload);
    await dbInsert("activity_events", {
      event_type: "product_created",
      entity_type: "product",
      entity_id: product?.id || null,
      title: `Створено товар: ${payload.name}`,
      metadata: { slug: payload.slug, status: payload.status, price: payload.price },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося створити товар" }, { status: 400 });
  }
}
