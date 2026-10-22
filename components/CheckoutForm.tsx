"use client";

import { FormEvent, useState } from "react";
import { useCart } from "@/components/CartProvider";

export default function CheckoutForm() {
  const { items, total } = useCart();
  const [delivery, setDelivery] = useState("nova");
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!items.length || isPaying) return;

    setError("");
    setIsPaying(true);

    const form = new FormData(e.currentTarget);
    const draft = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      city: String(form.get("city") || "").trim(),
      branch: String(form.get("branch") || "").trim(),
      comment: String(form.get("comment") || "").trim(),
      delivery,
      items,
      total,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("reset-order-draft", JSON.stringify(draft));

      const response = await fetch("/api/mono/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await response.json();
      if (!response.ok || !data?.pageUrl || !data?.invoiceId) {
        throw new Error(data?.error || "Не вдалося створити рахунок для оплати");
      }

      localStorage.setItem("reset-mono-payment", JSON.stringify({
        invoiceId: data.invoiceId,
        reference: data.reference,
        amount: data.amount,
        pageUrl: data.pageUrl,
        appUrl: data.appUrl || null,
        createdAt: new Date().toISOString(),
      }));

      window.location.assign(data.pageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося перейти до оплати");
      setIsPaying(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <section className="checkout-section">
        <h2>Контактні дані</h2>
        <div className="checkout-fields">
          <div className="checkout-field"><label htmlFor="name">Ім’я та прізвище</label><input id="name" name="name" required autoComplete="name" /></div>
          <div className="checkout-field"><label htmlFor="phone">Телефон</label><input id="phone" name="phone" required autoComplete="tel" placeholder="+380" /></div>
          <div className="checkout-field full"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" /></div>
        </div>
      </section>

      <section className="checkout-section">
        <h2>Доставка</h2>
        <div className="delivery-options">
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "nova"} onChange={() => setDelivery("nova")} /><span><strong>Нова Пошта</strong><span>Відділення або поштомат · 1–3 робочі дні</span></span></label>
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "courier"} onChange={() => setDelivery("courier")} /><span><strong>Кур’єрська доставка</strong><span>Адресна доставка за тарифами перевізника</span></span></label>
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} /><span><strong>Самовивіз із RESET Clinic</strong><span>Львів, вул. Кульпарківська, 93/2</span></span></label>
        </div>
        {delivery !== "pickup" && <div className="checkout-fields" style={{ marginTop: 14 }}>
          <div className="checkout-field"><label htmlFor="city">Місто</label><input id="city" name="city" required={delivery !== "pickup"} /></div>
          <div className="checkout-field"><label htmlFor="branch">Відділення / адреса</label><input id="branch" name="branch" required={delivery !== "pickup"} /></div>
        </div>}
      </section>

      <section className="checkout-section checkout-payment-section">
        <h2>Оплата</h2>
        <div className="mono-payment-choice" aria-label="Онлайн-оплата monobank">
          <div className="mono-payment-mark"><span>mono</span></div>
          <div><strong>Онлайн-оплата через monobank</strong><span>Картка · Apple Pay · Google Pay · monobank</span></div>
          <i aria-hidden="true">✓</i>
        </div>
        <p className="mono-payment-security">Платіж проходить на захищеній сторінці monobank. RESET Clinic не отримує і не зберігає дані вашої картки.</p>
      </section>

      <section className="checkout-section">
        <h2>Коментар</h2>
        <div className="checkout-field full"><label htmlFor="comment">Побажання до замовлення</label><textarea id="comment" name="comment" placeholder="Наприклад, хочу уточнити сумісність із моїм поточним доглядом" /></div>
      </section>

      <button className="checkout-submit mono-checkout-submit" type="submit" disabled={!items.length || isPaying}>
        {isPaying ? "СТВОРЮЄМО БЕЗПЕЧНИЙ ПЛАТІЖ…" : `ОПЛАТИТИ ОНЛАЙН · ${total.toFixed(2)} грн`}
      </button>
      <p className="checkout-note">Після натискання ви перейдете на офіційну платіжну сторінку monobank, а після оплати повернетеся в RESET Clinic.</p>
      {error && <div className="checkout-success checkout-payment-error"><strong>Оплату не запущено.</strong><br/>{error}</div>}
    </form>
  );
}
