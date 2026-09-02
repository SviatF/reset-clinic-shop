"use client";

import { FormEvent, useState } from "react";
import { useCart } from "@/components/CartProvider";

export default function CheckoutForm() {
  const { items, total } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [delivery, setDelivery] = useState("nova");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const draft = {
      name: form.get("name"),
      phone: form.get("phone"),
      email: form.get("email"),
      city: form.get("city"),
      branch: form.get("branch"),
      comment: form.get("comment"),
      delivery,
      items,
      total,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("reset-order-draft", JSON.stringify(draft));
    setSubmitted(true);
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

      <section className="checkout-section">
        <h2>Коментар</h2>
        <div className="checkout-field full"><label htmlFor="comment">Побажання до замовлення</label><textarea id="comment" name="comment" placeholder="Наприклад, хочу уточнити сумісність із моїм поточним доглядом" /></div>
      </section>

      <button className="checkout-submit" type="submit" disabled={!items.length}>Підтвердити дані замовлення</button>
      <p className="checkout-note">Цей крок зберігає дані замовлення у вашому браузері. Онлайн-оплату WayForPay можна підключити після додавання merchant credentials.</p>
      {submitted && <div className="checkout-success"><strong>Дані збережено.</strong><br/>Структура checkout готова. Для реальної передачі замовлення та онлайн-оплати потрібне підключення платіжного шлюзу/CRM.</div>}
    </form>
  );
}
