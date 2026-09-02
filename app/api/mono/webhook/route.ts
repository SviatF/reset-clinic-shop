import { NextResponse } from "next/server";
import { verifyMonoWebhook } from "@/lib/mono";
import { dbInsert, dbSelect, dbUpdate, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderStatus(paymentStatus: string) {
  if (paymentStatus === "success") return "paid";
  if (paymentStatus === "reversed") return "refunded";
  if (paymentStatus === "failure" || paymentStatus === "expired") return "cancelled";
  return "awaiting_payment";
}

async function decrementStock(orderId: string) {
  const items = await dbSelect<any>("order_items", `select=product_id,quantity,name&order_id=eq.${encodeURIComponent(orderId)}`);
  for (const item of items) {
    if (!item.product_id) continue;
    const products = await dbSelect<any>("products", `select=id,name,stock_quantity,track_stock&id=eq.${encodeURIComponent(item.product_id)}&limit=1`);
    const product = products?.[0];
    if (!product?.track_stock) continue;
    const nextStock = Math.max(0, Number(product.stock_quantity || 0) - Number(item.quantity || 0));
    await dbUpdate("products", `id=eq.${encodeURIComponent(product.id)}`, { stock_quantity: nextStock });
    await dbInsert("activity_events", {
      event_type: "stock_decremented",
      entity_type: "product",
      entity_id: product.id,
      title: `Stock: ${product.name} → ${nextStock} шт.`,
      metadata: { orderId, quantity: item.quantity, stock: nextStock },
    });
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

    console.info("mono webhook", {
      invoiceId: payload.invoiceId,
      status: payload.status,
      amount: payload.amount,
      modifiedDate: payload.modifiedDate,
    });

    if (isSupabaseConfigured() && payload.invoiceId && payload.status) {
      const existing = await dbSelect<any>("orders", `select=id,order_number,payment_status,status&invoice_id=eq.${encodeURIComponent(payload.invoiceId)}&limit=1`);
      const order = existing?.[0];
      if (order) {
        const firstSuccess = payload.status === "success" && order.payment_status !== "success";
        const changes: Record<string, unknown> = {
          payment_status: payload.status,
          status: orderStatus(payload.status),
          mono_payload: payload,
        };
        if (payload.status === "success") changes.paid_at = payload.modifiedDate || new Date().toISOString();

        await dbUpdate("orders", `id=eq.${encodeURIComponent(order.id)}`, changes);
        await dbInsert("activity_events", {
          event_type: `payment_${payload.status}`,
          entity_type: "order",
          entity_id: order.id,
          title: `Оплата ${order.order_number}: ${payload.status}`,
          metadata: { invoiceId: payload.invoiceId, amount: (payload.finalAmount || payload.amount || 0) / 100 },
        });

        if (firstSuccess) await decrementStock(order.id);
      }
    }
  } catch (error) {
    console.error("mono webhook processing error", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
