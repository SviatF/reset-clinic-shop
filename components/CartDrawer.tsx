"use client";

import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import certificateImg from "@/assets/img/main-certificate.webp";
import { cartItemHref, certificateFromSlug, isCertificateSlug, isLegacyCertificateSlug } from "@/lib/certificate-products";
import { useCart } from "@/components/CartProvider";

const FREE_SHIPPING = 5000;

export default function CartDrawer() {
  const { items, total, isCartOpen, closeCart, remove, setQty } = useCart();
  const legacyCertificateInCart = items.some(item => isLegacyCertificateSlug(item.slug));
  const shippableTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const remaining = Math.max(0, FREE_SHIPPING - shippableTotal);
  const progress = Math.min(100, (shippableTotal / FREE_SHIPPING) * 100);

  return (
    <div className={`cart-drawer-layer ${isCartOpen ? "is-open" : ""}`} aria-hidden={!isCartOpen}>
      <button className="cart-drawer-backdrop" aria-label="Закрити кошик" onClick={closeCart} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Ваш кошик">
        <div className="cart-drawer-head">
          <div><span>RESET SHOP</span><h2>Ваш кошик</h2></div>
          <button onClick={closeCart} aria-label="Закрити">×</button>
        </div>

        {items.length > 0 && <div className="shipping-progress">
          <div className="shipping-copy">
            {remaining > 0 ? <span>До безкоштовної доставки залишилось <b>{remaining.toFixed(0)} грн</b></span> : <span><b>Безкоштовна доставка активована</b></span>}
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="shipping-track"><span style={{ width: `${progress}%` }} /></div>
        </div>}

        {!items.length ? (
          <div className="drawer-empty">
            <span>Ваш кошик готовий до правильного догляду.</span>
            <p>Оберіть професійний засіб або попросіть косметолога допомогти з підбором.</p>
            <Link href="/face" onClick={closeCart} className="black-button">Перейти до каталогу →</Link>
            <Link href="/consultation" onClick={closeCart} className="drawer-text-link">Підібрати догляд з косметологом</Link>
          </div>
        ) : (
          <>
            <div className="drawer-items">
              {items.map((item) => (
                <article className="drawer-item" key={item.slug}>
                  <Link className="drawer-thumb" href={cartItemHref(item.slug)} onClick={closeCart}><Image src={isCertificateSlug(item.slug) ? certificateImg : productImg} alt={item.name} /></Link>
                  <div className="drawer-item-copy">
                    <Link href={cartItemHref(item.slug)} onClick={closeCart}>{item.name}</Link>
                    {certificateFromSlug(item.slug) && <span className="cert-cart-detail"><b>УНІВЕРСАЛЬНИЙ:</b> на косметику та процедури</span>}
                    {isLegacyCertificateSlug(item.slug) && <span className="cert-cart-legacy">Цей варіант сертифіката більше недоступний. Видаліть його й оберіть новий номінал.</span>}
                    <span>{item.price}.00₴</span>
                    <div className="drawer-item-controls">
                      <div className="qty-control"><button onClick={() => setQty(item.slug, item.qty - 1)}>−</button><span>{item.qty}</span><button onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div>
                      <button className="drawer-remove" onClick={() => remove(item.slug)}>Видалити</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="drawer-consultation">
              <span>ПРОФЕСІЙНА ПЕРЕВІРКА</span>
              <p>Не впевнені, що засоби сумісні? Перед оформленням можна пройти короткий підбір догляду.</p>
              <Link href="/consultation" onClick={closeCart}>Перевірити догляд →</Link>
            </div>

            <div className="drawer-total">
              <div><span>Разом</span><strong>{total.toFixed(2)}₴</strong></div>
              {legacyCertificateInCart ? <div className="cert-cart-legacy">У кошику є старий варіант сертифіката. Видаліть його та <Link href="/certificate#certificate-order" onClick={closeCart}>оберіть актуальний номінал</Link>.</div> : <Link href="/checkout" onClick={closeCart} className="drawer-checkout">Оформити замовлення <span>→</span></Link>}
              <small>Спосіб отримання сертифікатів та товарів обирається при оформленні.</small>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
