"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CERTIFICATE_AMOUNTS, certificateSlug, certificateTitle, type CertificateFormat } from "@/lib/gift-certificates";

export default function CertificatePurchase() {
  const [amount, setAmount] = useState<number>(CERTIFICATE_AMOUNTS[1]);
  const [format, setFormat] = useState<CertificateFormat>("digital");
  const { add } = useCart();

  function addCertificate() {
    add({
      slug: certificateSlug(amount, format),
      name: certificateTitle(amount, format),
      price: amount,
    });
  }

  return (
    <section className="certificate-purchase-shell shell" id="certificate-order" aria-labelledby="certificate-buy-title">
      <div className="certificate-purchase-intro">
        <span className="editorial-kicker">RESET CLINIC · GIFT CARD</span>
        <h2 id="certificate-buy-title">Подарунок, який обирають самі.</h2>
        <p>Оберіть суму та спосіб отримання. Сертифікат можна використати на професійну косметику або послуги клініки.</p>
        <div className="certificate-purchase-facts">
          <span>01 / ДІЄ 3 МІСЯЦІ</span>
          <span>02 / КОСМЕТИКА ТА ПОСЛУГИ</span>
          <span>03 / ОНЛАЙН АБО ОФЛАЙН</span>
        </div>
      </div>

      <div className="certificate-purchase-panel">
        <div className="certificate-purchase-panel-top"><span>ПОДАРУНКОВИЙ СЕРТИФІКАТ</span><span>01 — 02</span></div>
        <fieldset className="certificate-choices">
          <legend>01 / Оберіть номінал</legend>
          <div className="certificate-amount-grid">
            {CERTIFICATE_AMOUNTS.map((value) => (
              <label className={`certificate-amount ${amount === value ? "is-selected" : ""}`} key={value}>
                <input type="radio" name="certificate-amount" value={value} checked={amount === value} onChange={() => setAmount(value)} />
                <span>{value.toLocaleString("uk-UA")} <small>₴</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="certificate-choices">
          <legend>02 / Оберіть формат отримання</legend>
          <div className="certificate-format-grid">
            <label className={`certificate-format ${format === "digital" ? "is-selected" : ""}`}>
              <input type="radio" name="certificate-format" value="digital" checked={format === "digital"} onChange={() => setFormat("digital")} />
              <strong>Онлайн</strong>
              <span>Електронний сертифікат на email після обробки замовлення.</span>
            </label>
            <label className={`certificate-format ${format === "physical" ? "is-selected" : ""}`}>
              <input type="radio" name="certificate-format" value="physical" checked={format === "physical"} onChange={() => setFormat("physical")} />
              <strong>Офлайн</strong>
              <span>Фізичний сертифікат: самовивіз із клініки або доставка.</span>
            </label>
          </div>
        </fieldset>

        <div className="certificate-purchase-bottom">
          <div><span>НОМІНАЛ СЕРТИФІКАТА</span><strong>{amount.toLocaleString("uk-UA")} ₴</strong></div>
          <button type="button" className="black-button certificate-add-button" onClick={addCertificate}>ДОДАТИ ДО КОШИКА <span aria-hidden="true">↗</span></button>
        </div>
        <p className="certificate-purchase-note">Формат і номінал збережуться в кошику та замовленні. Оплата — через monobank.</p>
      </div>
    </section>
  );
}
