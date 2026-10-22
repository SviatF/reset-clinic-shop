"use client";

import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import certificateImg from "@/assets/img/main-certificate.webp";
import { cartProductUrl, isCertificateSlug } from "@/lib/gift-certificates";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, total, remove, setQty } = useCart();
  const physicalTotal = items.filter((item) => !isCertificateSlug(item.slug)).reduce((sum, item) => sum + item.price * item.qty, 0);
  const remaining = Math.max(0, 5000 - physicalTotal);
  return (
    <section className="cart-page">
      <div className="shell">
        <h1>Кошик</h1>
        {!items.length ? (
          <div className="empty-cart"><p>Ваш кошик поки порожній.</p><Link className="black-button" href="/face">Перейти в каталог</Link></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map((item) => <article className="cart-row" key={item.slug}>
                <div className="cart-thumb"><Image src={isCertificateSlug(item.slug) ? certificateImg : productImg} alt={item.name}/></div>
                <div className="cart-info"><Link href={cartProductUrl(item.slug)}>{item.name}</Link><span>{item.price.toFixed(2)}₴</span></div>
                <div className="qty-control"><button onClick={() => setQty(item.slug, item.qty - 1)}>−</button><span>{item.qty}</span><button onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div>
                <button className="remove-item" onClick={() => remove(item.slug)}>×</button>
              </article>)}
            </div>
            <aside className="cart-summary">
              <span>РАЗОМ</span><strong>{total.toFixed(2)}₴</strong>
              {physicalTotal > 0 && <div className="shipping-progress"><div className="shipping-copy">{remaining > 0 ? <span>До безкоштовної доставки: <b>{remaining.toFixed(0)} грн</b></span> : <span><b>Безкоштовна доставка активована</b></span>}</div><div className="shipping-track"><span style={{width: `${Math.min(100, physicalTotal / 5000 * 100)}%`}} /></div></div>}
              <Link href="/checkout" className="add-cart">ОФОРМИТИ ЗАМОВЛЕННЯ</Link>
              <Link href="/consultation" className="drawer-text-link">Перевірити сумісність догляду →</Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
