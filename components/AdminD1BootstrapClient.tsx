"use client";

import { useCallback, useEffect, useState } from "react";

type Count = { pathname: string; records: number };
type State = {
  ok?: boolean;
  staging?: boolean;
  empty?: boolean;
  initialized?: boolean;
  blocked?: boolean;
  expected?: Count[];
  persisted?: Count[];
  activeStorage?: boolean;
  error?: string;
};

export default function AdminD1BootstrapClient() {
  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bootstrap-d1", { cache: "no-store" });
      const body = await response.json() as State;
      if (!response.ok) throw new Error(body.error || "Не вдалося перевірити D1");
      setData(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Помилка читання D1");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function initialize() {
    if (!data?.empty || data.staging !== true || busy) return;
    if (!window.confirm(
      "Створити НОВИЙ магазин у порожній D1? Буде записано 279 товарів, 16 категорій, 10 брендів; замовлення й історія будуть порожніми. Продовжити?"
    )) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bootstrap-d1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "CREATE_NEW_D1_279" }),
      });
      const body = await response.json() as { error?: string; message?: string; ok?: boolean };
      if (!response.ok || !body.ok) throw new Error(body.error || body.message || "Не вдалося заповнити базу");
      setMessage(body.message || "Дані записані в D1");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Помилка ініціалізації");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page-head">
        <div>
          <span>DATABASE INITIALIZATION · CLOUDFLARE D1</span>
          <h1>Нова база RESET Shop</h1>
          <p>Одноразове перенесення каталогу з GitHub до порожньої D1 без перезапису інших даних.</p>
        </div>
      </div>
      {message && <div className="admin-toast" role="status">{message}</div>}
      <div className="admin-connect-card">
        <span>SHOP_DB · reset-clinic-shop-db</span>
        <h2>{loading ? "Перевіряємо D1…" : data?.initialized ? "Базу заповнено" :
          data?.empty ? "База порожня — можна ініціалізувати" :
          data?.blocked ? "Ініціалізація заблокована" : "Очікується перевірка з’єднання"}</h2>
        <p>База: <code>38a072d9-bb85-4417-bf92-4f0652cc4056</code>.</p>
        <p>Джерело: 279 товарів, 16 категорій, 10 брендів, 0 замовлень і 0 подій.</p>
        {data?.blocked && <p><strong>Увага:</strong> У D1 уже існують документи, які не збігаються з початковим каталогом. Автоматичний запис вимкнено, щоб не пошкодити дані.</p>}
        {data?.initialized && <p>Усі п’ять документів перевірено за SHA-256. Тепер можна активувати D1 як основне сховище Worker.</p>}
        {data?.initialized && !data.activeStorage && <p><strong>Ще потрібно:</strong> після підтвердження імпорту встановити в Cloudflare Worker змінні <code>SHOP_STORAGE_BACKEND=cloudflare</code> і <code>SHOP_PRODUCTS_BACKEND=d1</code>, потім повторити деплой.</p>}
        {data?.initialized && data.activeStorage && <p>Активне сховище: Cloudflare D1. Перевір редагування у розділах «Товари» та «Бренди».</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-primary" disabled={busy || loading || !data?.empty || data.staging !== true} onClick={initialize}>
            {busy ? "Записуємо та перевіряємо…" : data?.initialized ? "D1 уже заповнено" : "Ініціалізувати порожню D1"}
          </button>
          <button type="button" onClick={() => { setMessage(""); void refresh(); }} disabled={busy || loading}>Оновити перевірку</button>
        </div>
      </div>
      {data?.expected && <section className="admin-connect-card">
        <span>КОНТРОЛЬ ДОКУМЕНТІВ</span>
        <h2>Початкові записи</h2>
        <table className="admin-table"><thead><tr><th>Документ</th><th>У GitHub</th><th>У D1</th></tr></thead>
          <tbody>{data.expected.map(row => <tr key={row.pathname}>
            <td>{row.pathname}</td><td>{row.records}</td>
            <td>{data.persisted?.find(x => x.pathname === row.pathname)?.records ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </section>}
    </div>
  );
}
