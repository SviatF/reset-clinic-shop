"use client";

import Link from "next/link";
import { useCart } from "./CartStore";
import styles from "./cart-page.module.css";

function formatMoney(amount: number, currency: "UAH" | "EUR" | "USD") {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UAH" ? 0 : 2,
  }).format(amount);
}

export function CartPage() {
  const { items, removeItem, setQuantity } = useCart();

  return (
    <main className={styles.page}>
      <header>
        <p>RESET SHOP</p>
        <h1>Кошик</h1>
      </header>

      {!items.length ? (
        <section className={styles.empty}>
          <h2>Ваш кошик порожній</h2>
          <p>Після додавання реальних товарів вони з’являться тут.</p>
          <Link href="/shop/">Перейти до каталогу</Link>
        </section>
      ) : (
        <div className={styles.cartLayout}>
          <div className={styles.items}>
            {items.map((item) => (
              <article className={styles.item} key={item.productId}>
                <div className={styles.image}>
                  {item.image ? <img src={item.image} alt="" /> : null}
                </div>
                <div>
                  <h2>{item.name}</h2>
                  <p>{formatMoney(item.price, item.currency)}</p>
                  <div className={styles.quantity}>
                    <button onClick={() => setQuantity(item.productId, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
                  </div>
                  <button className={styles.remove} onClick={() => removeItem(item.productId)}>
                    Видалити
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className={styles.total}>
            <p>До сплати</p>
            <strong>
              {formatMoney(
                items.reduce((sum, item) => sum + item.price * item.quantity, 0),
                items[0]?.currency ?? "UAH",
              )}
            </strong>
            <Link href="/checkout/">Оформити замовлення</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
