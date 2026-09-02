import { NextResponse } from "next/server";
import type { OrderRecord } from "@/lib/commerce-types";
import { appendActivity, mutateOrders, mutateProducts, readOrders } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";
import { verifyMonoWebhook } from "@/lib/mono";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderStatus(paymentStatus: string): OrderRecord["status"] {
  if (paymentStatus === "success") return "paid";
  if (paymentStatus === "reversed") return "refunded";
  if (paymentStatus === "failure" || paymentStatus === "expired") return "cancelled";
  return "awaiting_payment";
}

async function decrementStock(order: OrderRecord) {
  if (order.stock_decremented) return;
  await mutateProducts(`Order ${order.order_number}: decrement stock`, (products) => products.map((product) => {
    const line = order.items.find((item) => item.product_id === product.id || item.slug === product.slug);
    if (!line || !product.track_stock) return product;
    const nextStock = Math.max(0, Number(product.stock_quantity || 0) - Number(line.quantity || 0));
    return { ...product, stock_quantity: nextStock, updated_at: new Date().toISOString() };
  }));
  await mutateOrders(`Order ${order.order_number}: mark stock`, (orders) => orders.map((item) => item.id === order.id ? { ...item, stock_decremented: true, updated_at: new Date().toISOString() } : item));
  for (const line of order.items) {
    await appendActivity({ event_type: "stock_decremented", entity_type: "product", entity_id: line.product_id, title: `Stock списано: ${line.name} · ${line.quantity} шт.`, metadata: { orderId: order.id, quantity: line.quantity } });
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-sign") || "";
  const valid = await verifyMonoWebhook(rawBody, signature);
  if (!valid) return NextResponse.json({ error: "Invalid mono webhook signature" }, { status: 401 });
  try {
    const payload = JSON.parse(rawBody) as {
      invoiceId?: string;
      status?: string;
      amount?: number;
      finalAmount?: number;
      modifiedDate?: string;
      reference?: string;
      paymentInfo?: unknown;
    };
    if (!payload.invoiceId || !payload.status) return NextResponse.json({ ok: true });
    if (!jsonStoreWriteConfigured()) {
      console.warn("Mono webhook JSON persistence skipped: GITHUB_TOKEN is not configured");
      return NextResponse.json({ ok: true });
    }

    const before = (await readOrders()).find((item) => item.invoice_id === payload.invoiceId);
    if (!before) return NextResponse.json({ ok: true });
    let updated: OrderRecord | null = null;
    await mutateOrders(`Payment ${before.order_number}: ${payload.status}`, (orders) => orders.map((order) => {
      if (order.id !== before.id) return order;
      const next: OrderRecord = {
        ...order,
        payment_status: payload.status!,
        status: orderStatus(payload.status!),
        mono_payload: payload as Record<string, unknown>,
        paid_at: payload.status === "success" ? payload.modifiedDate || order.paid_at || new Date().toISOString() : order.paid_at,
        updated_at: new Date().toISOString(),
      };
      updated = next;
      return next;
    }));
    if (!updated) return NextResponse.json({ ok: true });
    await appendActivity({ event_type: `payment_${payload.status}`, entity_type: "order", entity_id: updated.id, title: `Оплата ${updated.order_number}: ${payload.status}`, metadata: { invoiceId: payload.invoiceId, amount: (payload.finalAmount || payload.amount || 0) / 100 } });
    if (payload.status === "success" && !updated.stock_decremented) await decrementStock(updated);
  } catch (error) {
    console.error("mono webhook processing error", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
