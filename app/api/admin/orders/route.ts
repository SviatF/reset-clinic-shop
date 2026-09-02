import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readOrders } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const payment = url.searchParams.get("payment");
    let orders = await readOrders();
    if (status && status !== "all") orders = orders.filter((order) => order.status === status);
    if (payment && payment !== "all") orders = orders.filter((order) => order.payment_status === payment);
    orders = orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 250);
    return NextResponse.json({ configured: true, writable: jsonStoreWriteConfigured(), orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "JSON read error" }, { status: 500 });
  }
}
