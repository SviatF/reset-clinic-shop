import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { dbDelete, dbInsert, dbUpdate, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set([
  "slug","name","brand","sku","category","status","short_description","description","price","stock_quantity","track_stock","size","image_url","secondary_image_url","hover_label","hover_title","hover_text","how_to_use","key_ingredients","inci","seo_title","seo_description","seo_keywords","featured","sort_order","published_at",
]);

function sanitize(body: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (!allowed.has(key)) continue;
    next[key] = value;
  }
  if ("price" in next) next.price = Math.max(0, Number(next.price) || 0);
  if ("stock_quantity" in next) next.stock_quantity = Math.max(0, Math.trunc(Number(next.stock_quantity) || 0));
  if ("sort_order" in next) next.sort_order = Math.trunc(Number(next.sort_order) || 0);
  if (next.status === "active" && !next.published_at) next.published_at = new Date().toISOString();
  return next;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ще не підключений" }, { status: 503 });
  const { id } = await context.params;

  try {
    const changes = sanitize(await request.json());
    const rows = await dbUpdate<any>("products", `id=eq.${encodeURIComponent(id)}`, changes);
    const product = rows?.[0];
    if (!product) return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
    await dbInsert("activity_events", {
      event_type: "product_updated",
      entity_type: "product",
      entity_id: id,
      title: `Оновлено товар: ${product.name}`,
      metadata: { fields: Object.keys(changes), status: product.status, price: product.price, stock: product.stock_quantity },
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося оновити товар" }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ще не підключений" }, { status: 503 });
  const { id } = await context.params;

  try {
    await dbDelete("products", `id=eq.${encodeURIComponent(id)}`);
    await dbInsert("activity_events", {
      event_type: "product_deleted",
      entity_type: "product",
      entity_id: id,
      title: "Товар видалено",
      metadata: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося видалити товар" }, { status: 400 });
  }
}
