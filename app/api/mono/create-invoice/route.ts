import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { monoFetch, normalizeOrder, SITE_URL } from "@/lib/mono";

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

    return NextResponse.json({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
      appUrl: data.appUrl || null,
      reference,
      amount,
      currency: "UAH",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Помилка створення платежу";
    const status = message.includes("MONOPAY_TOKEN") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
