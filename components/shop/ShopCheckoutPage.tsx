"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  RESET_CART_EVENT,
  cartSubtotal,
  clearCart,
  formatUah,
  readCartFromStorage,
  type ResetCartItem,
} from "../../lib/shop-cart";

export function ShopCheckoutPage() {
  const [items, setItems] = useState<ResetCartItem[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  useEffect(() => {
    const refresh = () => setItems(readCartFromStorage());
    refresh();
    window.addEventListener(RESET_CART_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RESET_CART_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length || status === "sending") return;
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");

    const payload = {
      customer: {
        firstName: String(form.get("firstName") || ""),
        lastName: String(form.get("lastName") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        city: String(form.get("city") || ""),
        comment: String(form.get("comment") || ""),
      },
      delivery: {
        method: String(form.get("deliveryMethod") || ""),
        address: String(form.get("deliveryAddress") || ""),
      },
      paymentMethod: String(form.get("paymentMethod") || ""),
      items,
    };

    try {
      const response = await fetch("/api/orders/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(result.message || "Не вдалося передати замовлення. Спробуйте ще раз або звʼяжіться з клінікою.");
        return;
      }

      setOrderId(result.orderId || "");
      clearCart();
      setItems([]);
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Не вдалося передати замовлення. Перевірте інтернет-зʼєднання та спробуйте ще раз.");
    }
  };

  if (status === "success") {
    return (
      <main className="reset-commerce-page reset-checkout-page">
        <div className="reset-commerce-shell">
          <section className="reset-order-success">
            <span className="reset-commerce-eyebrow">Замовлення прийнято</span>
            <h1>Дякуємо за замовлення</h1>
            {orderId ? <p className="reset-order-number">Номер замовлення: <strong>{orderId}</strong></p> : null}
            <p>Команда RESET звʼяжеться з вами для підтвердження деталей доставки та оплати.</p>
            <a className="reset-commerce-button" href="/">Повернутися до магазину</a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="reset-commerce-page reset-checkout-page">
      <div className="reset-commerce-shell">
        <div className="reset-commerce-breadcrumbs"><a href="/">RESET Shop</a><span>/</span><a href="/cart/">Кошик</a><span>/</span><span>Оформлення</span></div>
        <header className="reset-commerce-heading">
          <span className="reset-commerce-eyebrow">Останній крок</span>
          <h1>Оформлення замовлення</h1>
        </header>

        {!items.length ? (
          <section className="reset-cart-empty">
            <h2>У кошику немає товарів</h2>
            <p>Додайте засоби до кошика перед оформленням замовлення.</p>
            <a className="reset-commerce-button" href="/">Повернутися до магазину</a>
          </section>
        ) : (
          <form className="reset-checkout-layout" onSubmit={submit}>
            <section className="reset-checkout-form">
              <div className="reset-checkout-section">
                <h2>Контактні дані</h2>
                <div className="reset-checkout-grid">
                  <label><span>Імʼя *</span><input name="firstName" autoComplete="given-name" required /></label>
                  <label><span>Прізвище</span><input name="lastName" autoComplete="family-name" /></label>
                  <label><span>Телефон *</span><input name="phone" type="tel" autoComplete="tel" required /></label>
                  <label><span>Email</span><input name="email" type="email" autoComplete="email" /></label>
                </div>
              </div>

              <div className="reset-checkout-section">
                <h2>Доставка</h2>
                <div className="reset-checkout-grid">
                  <label><span>Місто *</span><input name="city" autoComplete="address-level2" required /></label>
                  <label>
                    <span>Спосіб доставки *</span>
                    <select name="deliveryMethod" defaultValue="Нова пошта" required>
                      <option>Нова пошта</option>
                      <option>Курʼєрська доставка</option>
                      <option>Самовивіз із RESET Clinic</option>
                    </select>
                  </label>
                  <label className="reset-checkout-full"><span>Відділення / адреса *</span><input name="deliveryAddress" autoComplete="street-address" required /></label>
                </div>
              </div>

              <div className="reset-checkout-section">
                <h2>Оплата</h2>
                <div className="reset-payment-options">
                  <label><input type="radio" name="paymentMethod" value="Оплата при отриманні" defaultChecked /><span><strong>Оплата при отриманні</strong><small>За умовами перевізника</small></span></label>
                  <label><input type="radio" name="paymentMethod" value="Оплата за реквізитами" /><span><strong>Оплата за реквізитами</strong><small>Менеджер надішле дані після підтвердження</small></span></label>
                </div>
              </div>

              <div className="reset-checkout-section">
                <label className="reset-checkout-full"><span>Коментар до замовлення</span><textarea name="comment" rows={4} /></label>
              </div>
            </section>

            <aside className="reset-checkout-summary">
              <span className="reset-commerce-eyebrow">Ваше замовлення</span>
              <div className="reset-checkout-products">
                {items.map((item) => (
                  <div className="reset-checkout-product" key={item.key}>
                    {item.image ? <img src={item.image} alt="" /> : <span className="reset-checkout-product-placeholder" />}
                    <div><strong>{item.name}</strong><span>{item.quantity} × {item.priceText || formatUah(item.price)}</span></div>
                    <b>{formatUah(item.price * item.quantity)}</b>
                  </div>
                ))}
              </div>
              <div className="reset-cart-summary-row"><span>Товари</span><strong>{formatUah(subtotal)}</strong></div>
              <div className="reset-cart-summary-row reset-cart-summary-note"><span>Доставка</span><span>За тарифами перевізника</span></div>
              <div className="reset-cart-summary-total"><span>Разом</span><strong>{formatUah(subtotal)}</strong></div>
              {status === "error" ? <div className="reset-checkout-error" role="alert">{message}</div> : null}
              <label className="reset-checkout-consent"><input type="checkbox" required /><span>Підтверджую правильність контактних даних та погоджуюсь на обробку даних для оформлення замовлення.</span></label>
              <button className="reset-commerce-button reset-commerce-button-full" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Відправляємо…" : "Підтвердити замовлення"}
              </button>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
