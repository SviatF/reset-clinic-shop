"use client";

import Image from "next/image";
import Link from "next/link";
import certificateImg from "@/assets/img/main-certificate.webp";
import { cartItemHref, certificateFromSlug, isCertificateSlug, isLegacyCertificateSlug } from "@/lib/certificate-products";
import { useCart } from "@/components/CartProvider";
import SmartProductImage from "@/components/SmartProductImage";
import { CART_BENEFITS, physicalCartSubtotal } from "@/lib/cart-benefits";

export default function CartDrawer() {
  const { items, total, isCartOpen, closeCart, remove, setQty } = useCart();
  const legacyCertificateInCart = items.some(item => isLegacyCertificateSlug(item.slug));
  const shippableTotal = physicalCartSubtotal(items);

  return (
    <div className={`cart-drawer-layer ${isCartOpen ? "is-open" : ""}`} aria-hidden={!isCartOpen}>
      <button className="cart-drawer-backdrop" aria-label="Закрити кошик" onClick={closeCart} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Ваш кошик">
        <div className="cart-drawer-head">
          <div><span>RESET SHOP</span><h2>Ваш кошик</h2></div>
          <button onClick={closeCart} aria-label="Закрити">×</button>
        </div>

        {shippableTotal > 0 && <div className="shipping-progress" aria-label="Бонуси за покупки">
          {CART_BENEFITS.map((benefit) => {
            const remaining = Math.max(0, benefit.threshold - shippableTotal);
            const progress = Math.min(100, Math.round(shippableTotal / benefit.threshold * 100));
            return <div className="cart-benefit" key={benefit.id}>
              <div className="shipping-copy">
                <span>{remaining > 0 ? <>До {benefit.toLabel} залишилось <b>{remaining.toLocaleString("uk-UA")} грн</b></> : <b>{benefit.label} ✓</b>}</span>
                <span className="cart-benefit-percent">{remaining > 0 ? `${progress}%` : "100%"}</span>
              </div>
              <div className="shipping-track" role="progressbar" aria-label={benefit.label} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>;
          })}
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
                  <Link className="drawer-thumb" href={cartItemHref(item.slug)} onClick={closeCart}>{isCertificateSlug(item.slug)
                    ? <Image src={certificateImg} alt={item.name} />
                    : <SmartProductImage src={item.imageUrl} alt={item.name} fallback={<span className="drawer-photo-missing">Фото уточнюється</span>} />}</Link>
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
