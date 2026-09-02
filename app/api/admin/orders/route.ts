import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { OrderRecord } from "@/lib/commerce-types";
import { dbSelect, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false, orders: [] });

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const payment = url.searchParams.get("payment");
    const filters = ["select=*"];
    if (status && status !== "all") filters.push(`status=eq.${encodeURIComponent(status)}`);
    if (payment && payment !== "all") filters.push(`payment_status=eq.${encodeURIComponent(payment)}`);
    filters.push("order=created_at.desc", "limit=250");
    const orders = await dbSelect<OrderRecord>("orders", filters.join("&"));
    return NextResponse.json({ configured: true, orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
