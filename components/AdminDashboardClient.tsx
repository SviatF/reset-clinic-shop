"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  configured: boolean;
  metrics: null | {
    revenue: number;
    monthRevenue: number;
    orders: number;
    paidOrders: number;
    todayOrders: number;
    averageOrder: number;
    activeProducts: number;
    draftProducts: number;
    lowStock: number;
    unitsInStock: number;
  };
  recentOrders: any[];
  lowStock?: any[];
  activity: any[];
};

const money = (value: number) => new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(value || 0);

export default function AdminDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Не вдалося завантажити dashboard");
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Помилка"));
  }, []);

  if (error) return <div className="admin-state admin-state-error">{error}</div>;
  if (!data) return <div className="admin-state">Завантажуємо дані магазину…</div>;
  if (!data.configured || !data.metrics) return <div className="admin-connect-card"><span>DATABASE</span><h2>Supabase ще не підключений</h2><p>Інтерфейс адмінки вже готовий. Після створення окремої бази RESET і додавання server env тут автоматично з’являться продажі, товари, залишки та активність.</p></div>;

  const m = data.metrics;
  const cards = [
    ["Оборот", money(m.revenue), "Усі успішні оплати"],
    ["Цей місяць", money(m.monthRevenue), "Оплачений оборот"],
    ["Замовлення", String(m.orders), `${m.todayOrders} сьогодні`],
    ["Середній чек", money(m.averageOrder), `${m.paidOrders} оплат`],
    ["Активні товари", String(m.activeProducts), `${m.draftProducts} draft`],
    ["Залишок", String(m.unitsInStock), `${m.lowStock} позицій ≤ 5 шт.`],
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-page-head"><div><span>LIVE COMMERCE</span><h1>Dashboard</h1><p>Продажі, замовлення, stock та активність RESET Shop.</p></div><div className="admin-live"><i /> LIVE</div></div>
      <div className="admin-metric-grid">{cards.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

      <div className="admin-two-col">
        <section className="admin-panel"><div className="admin-panel-head"><div><span>RECENT</span><h2>Останні замовлення</h2></div><a href="/admin/orders">Всі замовлення →</a></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>№</th><th>Клієнт</th><th>Статус</th><th>Сума</th><th>Дата</th></tr></thead><tbody>{data.recentOrders.length ? data.recentOrders.map((order) => <tr key={order.id}><td>{order.order_number}</td><td>{order.customer_name || "—"}<small>{order.phone}</small></td><td><span className={`admin-status status-${order.status}`}>{order.status}</span></td><td>{money(Number(order.total))}</td><td>{new Date(order.created_at).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td></tr>) : <tr><td colSpan={5}>Замовлень поки немає.</td></tr>}</tbody></table></div>
        </section>

        <section className="admin-panel"><div className="admin-panel-head"><div><span>ACTIVITY</span><h2>Остання активність</h2></div></div><div className="admin-activity-list">{data.activity.length ? data.activity.slice(0, 12).map((item) => <article key={item.id}><i /><div><strong>{item.title}</strong><span>{new Date(item.created_at).toLocaleString("uk-UA")}</span></div></article>) : <p>Активності ще немає.</p>}</div></section>
      </div>
    </div>
  );
}
