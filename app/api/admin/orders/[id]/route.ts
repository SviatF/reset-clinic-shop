import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { dbInsert, dbUpdate, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = new Set(["new","awaiting_payment","paid","processing","shipped","completed","cancelled","refunded"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ще не підключений" }, { status: 503 });
  const { id } = await context.params;

  try {
    const body = await request.json();
    const changes: Record<string, unknown> = {};
    if (typeof body?.status === "string" && statuses.has(body.status)) changes.status = body.status;
    if (typeof body?.tracking_number === "string") changes.tracking_number = body.tracking_number.trim().slice(0, 120) || null;
    if (typeof body?.admin_notes === "string") changes.admin_notes = body.admin_notes.trim().slice(0, 3000) || null;
    if (!Object.keys(changes).length) return NextResponse.json({ error: "Немає змін" }, { status: 400 });

    const rows = await dbUpdate<any>("orders", `id=eq.${encodeURIComponent(id)}`, changes);
    const order = rows?.[0];
    if (!order) return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });

    await dbInsert("activity_events", {
      event_type: "order_updated",
      entity_type: "order",
      entity_id: id,
      title: `Замовлення ${order.order_number}: ${order.status}`,
      metadata: changes,
    });
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не вдалося оновити замовлення" }, { status: 400 });
  }
}
