import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { OrderRecord } from "@/lib/commerce-types";
import { appendActivity, mutateOrders, readOrders, newId } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";
import { monoFetch, normalizeOrder, SITE_URL, type NormalizedCheckoutItem } from "@/lib/mono";
import { certificateFromSlug } from "@/lib/certificate-products";

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
  certificate_recipient_email?: string;
  certificate_message?: string;
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
  items: NormalizedCheckoutItem[];
}) {
  if (!jsonStoreWriteConfigured()) {
    console.warn("Order JSON persistence skipped: GITHUB_TOKEN is not configured");
    return;
  }
  try {
    const now = new Date().toISOString();
    const order: OrderRecord = {
      id: newId("order"),
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
      certificate_recipient_email: clean(args.body.certificate_recipient_email, 120) || null,
      certificate_message: clean(args.body.certificate_message, 500) || null,
      tracking_number: null,
      admin_notes: null,
      subtotal: args.amount / 100,
      shipping: 0,
      total: args.amount / 100,
      currency: "UAH",
      items: args.items.map((item) => ({
        product_id: item.productId,
        slug: item.slug,
        name: item.name,
        sku: item.sku,
        unit_price: item.unitAmount / 100,
        quantity: item.qty,
        line_total: item.totalAmount / 100,
      })),
      mono_payload: null,
      stock_decremented: false,
      paid_at: null,
      created_at: now,
      updated_at: now,
    };
    await mutateOrders(`Order ${order.order_number}: created`, (orders) => [order, ...orders]);
    // Audit event failure must not hide a successfully stored order from the payer.
    try {
      await appendActivity({ event_type: "order_created", entity_type: "order", entity_id: order.id, title: `Нове замовлення ${order.order_number}`, metadata: { invoiceId: args.invoiceId, total: args.amount / 100 } });
    } catch (auditError) {
      console.error("Order activity log failed", auditError);
    }
  } catch (error) {
    console.error("Failed to persist commerce order", error);
    throw new Error("Не вдалося зберегти замовлення. Оплату не запущено — перевірте налаштування сховища.");
  }
}

export async function POST(request: Request) {
  // A preview branch must not create chargeable bank invoices.
  if (process.env.SHOP_STAGING === "true") {
    return NextResponse.json({
      error: "Онлайн-оплата вимкнена на тестовій версії. Сертифікат можна додати до кошика та перевірити оформлення без списання коштів.",
    }, { status: 503 });
  }
  if (!jsonStoreWriteConfigured()) {
    return NextResponse.json({ error: "Сховище замовлень не налаштоване" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as CreateInvoiceBody;
    const { items, amount } = await normalizeOrder(body.items || []);
    const hasCertificate = items.some(item => certificateFromSlug(item.slug) !== null);
    const email = clean(body.email, 120);
    if (!clean(body.name) || !clean(body.phone, 80)) throw new Error("Вкажіть ім’я та номер телефону");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Перевірте email покупця");
    if (body.certificate_recipient_email && (!hasCertificate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.certificate_recipient_email))) throw new Error("Перевірте email одержувача сертифіката");
    if (!["nova", "courier", "pickup"].includes(body.delivery || "")) throw new Error("Оберіть спосіб доставки або самовивіз");
    if (body.delivery !== "pickup" && (!clean(body.city) || !clean(body.branch,240))) throw new Error("Вкажіть місто та відділення або адресу доставки");
    // Never create a charge for an order that cannot be stored and fulfilled.
    if (!jsonStoreWriteConfigured()) return NextResponse.json({ error: "Замовлення не можна оплатити, доки не підключено сховище замовлень." }, { status: 503 });
    // Read the order store before creating a bank invoice. Reject inaccessible
    // private GitHub/D1 storage instead of charging without an order record.
    await readOrders();
    const reference = randomUUID().replaceAll("-", "");
    const orderCode = reference.slice(0, 8).toUpperCase();
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
        basketOrder: items.map((item) => ({ name: item.name, qty: item.qty, sum: item.unitAmount, total: item.totalAmount, unit: "шт.", code: item.slug })),
      },
    };
    const response = await monoFetch("/api/merchant/invoice/create", {
      method: "POST",
      body: JSON.stringify(monoPayload),
      headers: { "X-Cms": "RESET Clinic Next.js", "X-Cms-Version": "1.0" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data?.errText === "string" ? data.errText : typeof data?.message === "string" ? data.message : "Не вдалося створити рахунок mono";
      return NextResponse.json({ error: message }, { status: response.status });
    }
    if (!data?.invoiceId || !data?.pageUrl) return NextResponse.json({ error: "mono не повернув посилання на оплату" }, { status: 502 });
    await persistOrder({ invoiceId: data.invoiceId, reference, orderCode, amount, body, items });
    return NextResponse.json({ invoiceId: data.invoiceId, pageUrl: data.pageUrl, appUrl: data.appUrl || null, reference, orderNumber: `RST-${orderCode}`, amount, currency: "UAH" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Помилка створення платежу";
    const status = message.includes("MONOPAY_TOKEN") || message.includes("JSON_STORE") || message.includes("Cloudflare SHOP_DB") || message.includes("Не вдалося зберегти") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
