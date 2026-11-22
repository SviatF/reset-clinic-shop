import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { OrderRecord } from "@/lib/commerce-types";
import { appendActivity, mutateOrders } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";
import { queueOrderTelegram } from "@/lib/telegram-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const statuses = new Set(["new","awaiting_payment","paid","processing","shipped","completed","cancelled","refunded"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN не налаштований" }, { status: 503 });
  const { id } = await context.params;
  try {
    const body = await request.json();
    const changes: Partial<OrderRecord> = {};
    if (typeof body?.status === "string" && statuses.has(body.status)) changes.status = body.status;
    if (typeof body?.tracking_number === "string") changes.tracking_number = body.tracking_number.trim().slice(0, 120) || null;
    if (typeof body?.admin_notes === "string") changes.admin_notes = body.admin_notes.trim().slice(0, 3000) || null;
    if (!Object.keys(changes).length) return NextResponse.json({ error: "Немає змін" }, { status: 400 });
    let oldStatus: OrderRecord["status"] | null = null;
    const nextOrders = await mutateOrders(`Admin: update order ${id}`, (orders) => {
      const index = orders.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Замовлення не знайдено");
      const copy = [...orders];
      const current = copy[index];
      oldStatus = current.status;
      const confirmedCash = current.payment_method === "cash_on_pickup" &&
        changes.status === "paid" && current.payment_status !== "cash_paid";
      copy[index] = {
        ...current, ...changes,
        ...(confirmedCash ? { payment_status: "cash_paid", paid_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      } as OrderRecord;
      return copy;
    });
    const updated = nextOrders.find((item) => item.id === id);
    if (!updated) return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });
    await appendActivity({ event_type: "order_updated", entity_type: "order", entity_id: id, title: `Замовлення ${updated.order_number}: ${updated.status}`, metadata: changes as Record<string, unknown> });
    if (oldStatus && oldStatus !== updated.status) {
      const event = updated.payment_method === "cash_on_pickup" && updated.status === "paid"
        ? "paid" : updated.status === "cancelled" ? "cancelled"
        : updated.status === "refunded" ? "refunded"
        : ["processing","shipped","completed"].includes(updated.status)
          ? "status:"+updated.status : null;
      if (event) await queueOrderTelegram(updated,event);
    }
    return NextResponse.json({ order: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося оновити замовлення";
    return NextResponse.json({ error: message }, { status: message === "Замовлення не знайдено" ? 404 : 400 });
  }
}
