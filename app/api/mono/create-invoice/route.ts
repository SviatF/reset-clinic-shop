import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { monoFetch, normalizeOrder, SITE_URL } from "@/lib/mono";
import { dbInsert, dbSelect, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateInvoiceBody = {
  name?: string;
  phone?: string;
  email?: string;
  delivery?: string;
  city?: string;
  branch?: string;
  comment?: string;
  items?: Array<{ slug: string; qty: number }>;
};

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function persistOrder(args: {
  invoiceId: string;
  reference: string;
  orderCode: string;
  amount: number;
  body: CreateInvoiceBody;
  items: Array<{ slug: string; name: string; qty: number; unitAmount: number; totalAmount: number }>;
}) {
  if (!isSupabaseConfigured()) return;
  try {
    const order = await dbInsert<any>("orders", {
      order_number: `RST-${args.orderCode}`,
      invoice_id: args.invoiceId,
      reference: args.reference,
      status: "awaiting_payment",
      payment_status: "created",
      customer_name: clean(args.body.name, 180),
      phone: clean(args.body.phone, 80),
      email: clean(args.body.email, 120),
      delivery_method: clean(args.body.delivery, 40) || "nova",
      city: clean(args.body.city, 160),
      branch: clean(args.body.branch, 240),
      comment: clean(args.body.comment, 1000),
      subtotal: args.amount / 100,
      shipping: 0,
      total: args.amount / 100,
      currency: "UAH",
    });
    if (!order?.id) return;

    for (const item of args.items) {
      const productRows = await dbSelect<any>("products", `select=id,sku&slug=eq.${encodeURIComponent(item.slug)}&limit=1`);
      const dbProduct = productRows?.[0];
      await dbInsert("order_items", {
        order_id: order.id,
        product_id: dbProduct?.id || null,
        slug: item.slug,
        name: item.name,
        sku: dbProduct?.sku || null,
        unit_price: item.unitAmount / 100,
        quantity: item.qty,
        line_total: item.totalAmount / 100,
      });
    }

    await dbInsert("activity_events", {
      event_type: "order_created",
      entity_type: "order",
      entity_id: order.id,
      title: `Нове замовлення RST-${args.orderCode}`,
      metadata: { invoiceId: args.invoiceId, total: args.amount / 100 },
    });
  } catch (error) {
    console.error("Failed to persist commerce order", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateInvoiceBody;
    const { items, amount } = normalizeOrder(body.items || []);
    const reference = randomUUID().replaceAll("-", "");
    const orderCode = reference.slice(0, 8).toUpperCase();
    const email = clean(body.email, 120);

    const monoPayload = {
      amount,
      ccy: 980,
      paymentType: "debit",
      validity: 60 * 60,
      redirectUrl: `${SITE_URL}/payment/result`,
      webHookUrl: `${SITE_URL}/api/mono/webhook`,
      withAppUrl: true,
      merchantPaymInfo: {
        reference,
        destination: `RESET Clinic · замовлення ${orderCode}`,
        comment: "Онлайн-замовлення RESET Clinic",
        ...(email ? { customerEmails: [email] } : {}),
        basketOrder: items.map((item) => ({
          name: item.name,
          qty: item.qty,
          sum: item.unitAmount,
          total: item.totalAmount,
          unit: "шт.",
          code: item.slug,
        })),
      },
    };

    const response = await monoFetch("/api/merchant/invoice/create", {
      method: "POST",
      body: JSON.stringify(monoPayload),
      headers: {
        "X-Cms": "RESET Clinic Next.js",
        "X-Cms-Version": "1.0",
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data?.errText === "string" ? data.errText : typeof data?.message === "string" ? data.message : "Не вдалося створити рахунок mono";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    if (!data?.invoiceId || !data?.pageUrl) {
      return NextResponse.json({ error: "mono не повернув посилання на оплату" }, { status: 502 });
    }

    await persistOrder({ invoiceId: data.invoiceId, reference, orderCode, amount, body, items });

    return NextResponse.json({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
      appUrl: data.appUrl || null,
      reference,
      orderNumber: `RST-${orderCode}`,
      amount,
      currency: "UAH",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Помилка створення платежу";
    const status = message.includes("MONOPAY_TOKEN") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
