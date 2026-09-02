import { NextResponse } from "next/server";
import { monoFetch } from "@/lib/mono";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const invoiceId = new URL(request.url).searchParams.get("invoiceId")?.trim();
    if (!invoiceId) return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });

    const response = await monoFetch(`/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data?.errText || data?.message || "Не вдалося отримати статус платежу" }, { status: response.status });
    }

    return NextResponse.json({
      invoiceId: data.invoiceId,
      status: data.status,
      amount: data.amount,
      finalAmount: data.finalAmount,
      ccy: data.ccy,
      reference: data.reference,
      failureReason: data.failureReason,
      modifiedDate: data.modifiedDate,
      paymentMethod: data.paymentInfo?.paymentMethod || null,
      paymentSystem: data.paymentInfo?.paymentSystem || null,
      maskedPan: data.paymentInfo?.maskedPan || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Помилка перевірки платежу";
    const status = message.includes("MONOPAY_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
