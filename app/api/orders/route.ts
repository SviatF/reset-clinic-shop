import { NextResponse } from "next/server";

export const runtime = "nodejs";

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function orderId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/\D/g, "").slice(2, 14);
  return `RST-${stamp}`;
}

function telegramMessage(order: any, id: string) {
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items.map((item: any, index: number) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Number(item.price) || 0;
    const attrs = item.attributes && typeof item.attributes === "object"
      ? Object.values(item.attributes).filter(Boolean).join(", ")
      : "";
    return `${index + 1}. ${text(item.name, 160)}${attrs ? ` (${attrs})` : ""} × ${qty} — ${Math.round(price * qty)} грн`;
  });
  const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);

  return [
    `🛍 Нове замовлення RESET Shop ${id}`,
    "",
    `Імʼя: ${text(order.customer?.firstName)} ${text(order.customer?.lastName)}`.trim(),
    `Телефон: ${text(order.customer?.phone)}`,
    `Email: ${text(order.customer?.email) || "—"}`,
    `Місто: ${text(order.customer?.city) || "—"}`,
    `Доставка: ${text(order.delivery?.method) || "—"}`,
    `Адреса / відділення: ${text(order.delivery?.address) || "—"}`,
    `Оплата: ${text(order.paymentMethod) || "—"}`,
    `Коментар: ${text(order.customer?.comment, 1000) || "—"}`,
    "",
    ...lines,
    "",
    `Разом: ${Math.round(subtotal)} грн`,
  ].join("\n");
}

async function sendTelegram(order: any, id: string) {
  const token = process.env.RESET_SHOP_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.RESET_SHOP_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: telegramMessage(order, id),
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });

  return response.ok;
}

async function sendWebhook(order: any, id: string) {
  const url = process.env.RESET_SHOP_ORDER_WEBHOOK_URL;
  if (!url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...order, orderId: id, source: "reset-clinic-shop" }),
    cache: "no-store",
  });
  return response.ok;
}

export async function POST(request: Request) {
  let order: any;
  try {
    order = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const firstName = text(order?.customer?.firstName);
  const phone = text(order?.customer?.phone);
  if (!items.length || !firstName || phone.length < 7) {
    return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }

  const id = orderId();
  try {
    const results = await Promise.allSettled([sendTelegram(order, id), sendWebhook(order, id)]);
    const delivered = results.some((result) => result.status === "fulfilled" && result.value === true);

    if (!delivered) {
      return NextResponse.json(
        {
          ok: false,
          error: "order_channel_not_configured",
          message: "Канал прийому замовлень ще не підключений.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, orderId: id });
  } catch {
    return NextResponse.json({ ok: false, error: "order_delivery_failed" }, { status: 502 });
  }
}
