import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ActivityRecord, OrderRecord, ProductRecord } from "@/lib/commerce-types";
import { dbSelect, isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, metrics: null, recentOrders: [], activity: [] });
  }

  try {
    const [products, orders, activity] = await Promise.all([
      dbSelect<ProductRecord>("products", "select=*&order=created_at.desc"),
      dbSelect<OrderRecord>("orders", "select=*&order=created_at.desc&limit=500"),
      dbSelect<ActivityRecord>("activity_events", "select=*&order=created_at.desc&limit=30"),
    ]);

    const paid = orders.filter((order) => order.payment_status === "success" || ["paid","processing","shipped","completed"].includes(order.status));
    const revenue = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthPaid = paid.filter((order) => new Date(order.paid_at || order.created_at).getTime() >= monthStart);
    const todayOrders = orders.filter((order) => new Date(order.created_at).getTime() >= todayStart);
    const lowStock = products.filter((product) => product.status === "active" && product.track_stock && product.stock_quantity <= 5);

    return NextResponse.json({
      configured: true,
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
