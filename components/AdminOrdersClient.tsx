"use client";

import { useEffect, useMemo, useState } from "react";

const money = (value: number) => new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" }).format(value || 0);
const statuses = ["new","awaiting_payment","paid","processing","shipped","completed","cancelled","refunded"];

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<any[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => orders.find((order) => order.id === selectedId), [orders, selectedId]);

  async function load() {
    const response = await fetch(`/api/admin/orders?status=${encodeURIComponent(filter)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Не вдалося завантажити замовлення");
    setConfigured(data.configured);
    setOrders(data.orders || []);
  }

  useEffect(() => { load().catch((err) => setMessage(err.message)); }, [filter]);

  async function updateOrder(changes: Record<string, unknown>) {
    if (!selectedId) return;
    setMessage("");
    const response = await fetch(`/api/admin/orders/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const data = await response.json();
    if (!response.ok) return setMessage(data?.error || "Не вдалося оновити замовлення");
    await load();
    setMessage("Замовлення оновлено ✓");
  }

  return (
    <div className="admin-orders-page">
      <div className="admin-page-head"><div><span>ORDER CONTROL</span><h1>Замовлення</h1><p>Оплата, fulfillment, доставка та комунікація з клієнтом.</p></div><div className="admin-order-count">{orders.length}<span>orders</span></div></div>
      {configured === false && <div className="admin-connect-card"><span>DATABASE</span><h2>Supabase ще не підключений</h2><p>Після підключення платежі mono автоматично створюватимуть замовлення в цьому розділі.</p></div>}
      {message && <div className="admin-toast">{message}</div>}
      <div className="admin-filter-row"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Всі</button>{statuses.map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}</button>)}</div>

      <div className="admin-orders-workspace">
        <section className="admin-panel admin-orders-table-panel"><div className="admin-table-wrap"><table className="admin-table admin-orders-table"><thead><tr><th>Замовлення</th><th>Клієнт</th><th>Оплата</th><th>Статус</th><th>Сума</th><th>Дата</th></tr></thead><tbody>{orders.length ? orders.map((order) => <tr key={order.id} className={selectedId === order.id ? "is-selected" : ""} onClick={() => setSelectedId(order.id)}><td><strong>{order.order_number}</strong><small>{order.delivery_method}</small></td><td>{order.customer_name || "—"}<small>{order.phone}</small></td><td><span className={`admin-payment payment-${order.payment_status}`}>{order.payment_status}</span></td><td><span className={`admin-status status-${order.status}`}>{order.status}</span></td><td><strong>{money(Number(order.total))}</strong></td><td>{new Date(order.created_at).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td></tr>) : <tr><td colSpan={6}>Замовлень ще немає.</td></tr>}</tbody></table></div></section>

        <aside className="admin-order-detail">
          {selected ? <>
            <div className="admin-detail-head"><span>ORDER</span><h2>{selected.order_number}</h2><strong>{money(Number(selected.total))}</strong></div>
            <div className="admin-detail-grid"><div><span>Клієнт</span><strong>{selected.customer_name || "—"}</strong><a href={`tel:${selected.phone}`}>{selected.phone}</a><a href={`mailto:${selected.email}`}>{selected.email || "—"}</a></div><div><span>Доставка</span><strong>{selected.delivery_method}</strong><p>{selected.city}</p><p>{selected.branch}</p></div></div>
            <label className="admin-detail-field"><span>Статус</span><select value={selected.status} onChange={(event) => updateOrder({ status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="admin-detail-field"><span>ТТН / tracking</span><div><input key={`${selected.id}-${selected.tracking_number}`} defaultValue={selected.tracking_number || ""} id="admin-tracking" /><button onClick={() => updateOrder({ tracking_number: (document.getElementById("admin-tracking") as HTMLInputElement)?.value || "" })}>Зберегти</button></div></label>
            <label className="admin-detail-field"><span>Нотатка менеджера</span><textarea key={`${selected.id}-note`} defaultValue={selected.admin_notes || ""} id="admin-order-note" rows={4} /><button onClick={() => updateOrder({ admin_notes: (document.getElementById("admin-order-note") as HTMLTextAreaElement)?.value || "" })}>Зберегти нотатку</button></label>
            {selected.comment && <div className="admin-customer-comment"><span>КОМЕНТАР КЛІЄНТА</span><p>{selected.comment}</p></div>}
            <div className="admin-payment-meta"><span>MONOBANK</span><p>Invoice: {selected.invoice_id || "—"}</p><p>Payment: {selected.payment_status}</p>{selected.paid_at && <p>Оплачено: {new Date(selected.paid_at).toLocaleString("uk-UA")}</p>}</div>
          </> : <div className="admin-detail-empty"><span>SELECT ORDER</span><p>Оберіть замовлення з таблиці, щоб змінити статус, додати ТТН або нотатку.</p></div>}
        </aside>
      </div>
    </div>
  );
}
