"use client";

import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import certificateImg from "@/assets/img/main-certificate.webp";
import { cartItemHref, certificateFromSlug, isCertificateSlug, isLegacyCertificateSlug } from "@/lib/certificate-products";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, total, remove, setQty } = useCart();
  const legacyCertificateInCart = items.some(item => isLegacyCertificateSlug(item.slug));
  const shippableTotal = total;
  const remaining = Math.max(0, 5000 - shippableTotal);
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
                <div className="cart-info"><Link href={cartItemHref(item.slug)}>{item.name}</Link><span>{item.price}.00₴</span>{certificateFromSlug(item.slug) && <small className="cert-cart-detail"><b>Універсальний:</b> на косметику та процедури</small>}{isLegacyCertificateSlug(item.slug) && <small className="cert-cart-legacy">Застарілий варіант сертифіката — видаліть і оберіть новий номінал.</small>}</div>
                <div className="qty-control"><button onClick={() => setQty(item.slug, item.qty - 1)}>−</button><span>{item.qty}</span><button onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div>
                <button className="remove-item" onClick={() => remove(item.slug)}>×</button>
              </article>)}
            </div>
            <aside className="cart-summary">
              <span>РАЗОМ</span><strong>{total.toFixed(2)}₴</strong>
              {shippableTotal > 0 ? <div className="shipping-progress"><div className="shipping-copy">{remaining > 0 ? <span>До безкоштовної доставки: <b>{remaining.toFixed(0)} грн</b></span> : <span><b>Безкоштовна доставка активована</b></span>}</div><div className="shipping-track"><span style={{width: `${Math.min(100, shippableTotal / 5000 * 100)}%`}} /></div></div> : null}
              {legacyCertificateInCart ? <p className="cert-cart-legacy">Видаліть старий сертифікат і <Link href="/certificate#certificate-order">оберіть актуальний номінал</Link>, перш ніж оформити замовлення.</p> : <Link href="/checkout" className="add-cart">ОФОРМИТИ ЗАМОВЛЕННЯ</Link>}
              <Link href="/consultation" className="drawer-text-link">Перевірити сумісність догляду →</Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
