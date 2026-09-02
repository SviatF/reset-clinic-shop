import { NextResponse } from "next/server";
import { verifyMonoWebhook } from "@/lib/mono";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-sign") || "";

  const valid = await verifyMonoWebhook(rawBody, signature);
  if (!valid) return NextResponse.json({ error: "Invalid mono webhook signature" }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody) as { invoiceId?: string; status?: string; amount?: number; modifiedDate?: string };
    console.info("mono webhook", {
      invoiceId: payload.invoiceId,
      status: payload.status,
      amount: payload.amount,
      modifiedDate: payload.modifiedDate,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
