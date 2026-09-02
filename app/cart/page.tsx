"use client";

import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, total, remove, setQty } = useCart();
  return (
    <section className="cart-page">
      <div className="shell">
        <h1>Кошик</h1>
        {!items.length ? (
          <div className="empty-cart"><p>Ваш кошик поки порожній.</p><Link className="black-button" href="/catalog">Перейти в каталог</Link></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map((item) => <article className="cart-row" key={item.slug}>
                <div className="cart-thumb"><Image src={productImg} alt={item.name}/></div>
                <div className="cart-info"><Link href={`/product/${item.slug}`}>{item.name}</Link><span>{item.price}.00₴</span></div>
                <div className="qty-control"><button onClick={() => setQty(item.slug, item.qty - 1)}>−</button><span>{item.qty}</span><button onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div>
                <button className="remove-item" onClick={() => remove(item.slug)}>×</button>
              </article>)}
            </div>
            <aside className="cart-summary"><span>РАЗОМ</span><strong>{total.toFixed(2)}₴</strong><button className="add-cart">ОФОРМИТИ ЗАМОВЛЕННЯ</button><p>Менеджер RESET Clinic уточнить деталі замовлення та доставки.</p></aside>
          </div>
        )}
      </div>
    </section>
  );
}
