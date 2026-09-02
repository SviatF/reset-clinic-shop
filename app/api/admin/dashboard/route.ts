import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readActivity, readOrders, readProducts } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [products, rawOrders, rawActivity] = await Promise.all([readProducts(), readOrders(), readActivity()]);
    const orders = [...rawOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const activity = [...rawActivity].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30);
    const paid = orders.filter((order) => order.payment_status === "success" || ["paid","processing","shipped","completed"].includes(order.status));
    const revenue = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthPaid = paid.filter((order) => new Date(order.paid_at || order.created_at).getTime() >= monthStart);
    const todayOrders = orders.filter((order) => new Date(order.created_at).getTime() >= todayStart);
    const lowStock = products.filter((product) => product.status === "active" && product.track_stock && Number(product.stock_quantity) <= 5);
    return NextResponse.json({
      configured: true,
      writable: jsonStoreWriteConfigured(),
      metrics: {
        revenue,
        monthRevenue: monthPaid.reduce((sum, order) => sum + Number(order.total || 0), 0),
        orders: orders.length,
        paidOrders: paid.length,
        todayOrders: todayOrders.length,
        averageOrder: paid.length ? revenue / paid.length : 0,
        activeProducts: products.filter((product) => product.status === "active").length,
        draftProducts: products.filter((product) => product.status === "draft").length,
        lowStock: lowStock.length,
        unitsInStock: products.reduce((sum, product) => sum + Number(product.stock_quantity || 0), 0),
      },
      recentOrders: orders.slice(0, 10),
      lowStock: lowStock.slice(0, 10),
      activity,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "JSON read error" }, { status: 500 });
  }
}
