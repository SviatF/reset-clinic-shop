"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RESET_CART_EVENT,
  cartSubtotal,
  formatUah,
  readCartFromStorage,
  removeCartItem,
  updateCartItemQuantity,
  type ResetCartItem,
} from "../../lib/shop-cart";

function useCart() {
  const [items, setItems] = useState<ResetCartItem[]>([]);

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

  return [items, setItems] as const;
}

export function ShopCartPage() {
  const [items, setItems] = useCart();
  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const changeQuantity = (key: string, quantity: number) => {
    setItems(updateCartItemQuantity(key, quantity));
  };

  const remove = (key: string) => {
    setItems(removeCartItem(key));
  };

  return (
    <main className="reset-commerce-page reset-cart-page">
      <div className="reset-commerce-shell">
        <div className="reset-commerce-breadcrumbs"><a href="/">RESET Shop</a><span>/</span><span>Кошик</span></div>
        <header className="reset-commerce-heading">
          <span className="reset-commerce-eyebrow">Ваше замовлення</span>
          <h1>Кошик</h1>
        </header>

        {!items.length ? (
          <section className="reset-cart-empty">
            <h2>Ваш кошик поки порожній</h2>
            <p>Поверніться до каталогу та додайте засоби, які хочете замовити.</p>
            <a className="reset-commerce-button" href="/product-category/face/">Перейти до каталогу</a>
          </section>
        ) : (
          <div className="reset-cart-layout">
            <section className="reset-cart-list" aria-label="Товари у кошику">
              {items.map((item) => (
                <article className="reset-cart-line" key={item.key}>
                  <a className="reset-cart-line-image" href={item.href || "#"} aria-label={item.name}>
                    {item.image ? <img src={item.image} alt={item.name} /> : <span aria-hidden="true" />}
                  </a>
                  <div className="reset-cart-line-info">
                    <a className="reset-cart-line-title" href={item.href || "#"}>{item.name}</a>
                    {item.attributes && Object.values(item.attributes).some(Boolean) ? (
                      <div className="reset-cart-line-attrs">
                        {Object.entries(item.attributes).filter(([, value]) => Boolean(value)).map(([name, value]) => (
                          <span key={name}>{value}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="reset-cart-line-price">{item.priceText || formatUah(item.price)}</div>
                  </div>
                  <div className="reset-cart-line-actions">
                    <label className="reset-cart-quantity">
                      <span className="sr-only">Кількість {item.name}</span>
                      <button type="button" onClick={() => changeQuantity(item.key, Math.max(1, item.quantity - 1))} aria-label="Зменшити кількість">−</button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onChange={(event) => changeQuantity(item.key, Number(event.target.value || 1))}
                      />
                      <button type="button" onClick={() => changeQuantity(item.key, item.quantity + 1)} aria-label="Збільшити кількість">+</button>
                    </label>
                    <strong className="reset-cart-line-total">{formatUah(item.price * item.quantity)}</strong>
                    <button className="reset-cart-remove" type="button" onClick={() => remove(item.key)}>Видалити</button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="reset-cart-summary">
              <span className="reset-commerce-eyebrow">Разом</span>
              <div className="reset-cart-summary-row"><span>Товари</span><strong>{formatUah(subtotal)}</strong></div>
              <div className="reset-cart-summary-row reset-cart-summary-note"><span>Доставка</span><span>Розраховується під час оформлення</span></div>
              <div className="reset-cart-summary-total"><span>До сплати</span><strong>{formatUah(subtotal)}</strong></div>
              <a className="reset-commerce-button reset-commerce-button-full" href="/checkout/">Оформити замовлення</a>
              <a className="reset-cart-continue" href="/">Продовжити покупки</a>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
