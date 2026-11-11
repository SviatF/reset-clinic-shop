"use client";
import ArrowUpRight from "@/components/ArrowUpRight";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CERTIFICATE_DENOMINATIONS, certificateFromSlug, certificateSlug } from "@/lib/certificate-products";

const money = (amount: number) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(amount);

export default function CertificatePurchase() {
  const [amount, setAmount] = useState<number>(1500);
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const selected = certificateFromSlug(certificateSlug(amount));

  function submit() {
    if (!selected) return;
    add({ slug: selected.slug, name: selected.name, price: selected.price }, qty);
  }

  return (
    <section className="cert-shop-section" id="certificate-order" aria-labelledby="cert-shop-title">
      <div className="shell cert-shop-layout">
        <div className="cert-shop-intro">
          <span className="editorial-kicker">GIFT CERTIFICATE / RESET CLINIC</span>
          <h2 id="cert-shop-title">Один сертифікат. Безліч можливостей.</h2>
          <p><strong>Універсальний подарунковий сертифікат</strong> діє і на професійну косметику в магазині, і на процедури RESET Clinic. Нічого додатково обирати не потрібно — лише номінал.</p>
          <div className="cert-shop-facts">
            <div><span>01</span><strong>Косметика та процедури</strong><small>Єдиний сертифікат для обох напрямів</small></div>
            <div><span>02</span><strong>Дійсний 3 місяці</strong><small>З моменту придбання</small></div>
          </div>
        </div>

        <div className="cert-shop-form" aria-label="Придбати універсальний подарунковий сертифікат">
          <div className="cert-shop-form-head"><span>УНІВЕРСАЛЬНИЙ СЕРТИФІКАТ</span><span>RESET CLINIC</span></div>
          <fieldset className="cert-shop-fieldset">
            <legend>Оберіть номінал</legend>
            <div className="cert-amounts">
              {CERTIFICATE_DENOMINATIONS.map(value => (
                <label className={`cert-choice ${amount === value ? "is-active" : ""}`} key={value}>
                  <input type="radio" name="certificate-amount" value={value} checked={amount === value} onChange={() => setAmount(value)} />
                  <span>{money(value)} <small>₴</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="cert-shop-recap" aria-live="polite">
            <span className="cert-shop-recap-kicker">ВАШ СЕРТИФІКАТ</span>
            <strong>Універсальний сертифікат · {money(amount)} грн</strong>
            <span>На косметику в магазині та процедури в клініці</span>
          </div>

          <div className="cert-shop-bottom">
            <div className="cert-quantity"><span>Кількість</span><div><button type="button" onClick={() => setQty(Math.max(1,qty-1))} aria-label="Зменшити кількість">−</button><strong>{qty}</strong><button type="button" onClick={() => setQty(Math.min(20,qty+1))} aria-label="Збільшити кількість">+</button></div></div>
            <div className="cert-shop-total"><span>Разом</span><strong>{money(amount * qty)} ₴</strong></div>
          </div>
          <button type="button" onClick={submit} className="cert-shop-add">ДОДАТИ СЕРТИФІКАТ ДО КОШИКА <span aria-hidden="true"><ArrowUpRight /></span></button>
          <p className="cert-shop-footnote">Номінал сертифіката збережеться в кошику й замовленні. Спосіб отримання узгоджується під час оформлення замовлення.</p>
        </div>
      </div>
    </section>
  );
}
