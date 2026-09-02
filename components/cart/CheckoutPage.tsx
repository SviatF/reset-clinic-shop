"use client";

import { useState } from "react";
import { useCart } from "./CartStore";
import styles from "./cart-page.module.css";

export function CheckoutPage() {
  const { items, clear } = useCart();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <main className={styles.page}>
        <section className={styles.empty}>
          <h1>Дякуємо</h1>
          <p>Замовлення сформовано. Менеджер зв’яжеться з вами для підтвердження.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header>
        <p>RESET SHOP</p>
        <h1>Оформлення</h1>
      </header>
      <form
        className={styles.checkout}
        onSubmit={(event) => {
          event.preventDefault();
          if (!items.length) return;
          clear();
          setSubmitted(true);
        }}
      >
        <label>Ім’я<input name="name" autoComplete="name" required /></label>
        <label>Телефон<input name="phone" type="tel" autoComplete="tel" required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" /></label>
        <label>Місто<input name="city" autoComplete="address-level2" required /></label>
        <label className={styles.wide}>Адреса доставки<input name="address" autoComplete="street-address" required /></label>
        <label className={styles.wide}>Коментар<textarea name="comment" rows={4} /></label>
        <button className={styles.wide} type="submit" disabled={!items.length}>
          {items.length ? "Підтвердити замовлення" : "Кошик порожній"}
        </button>
      </form>
    </main>
  );
}
