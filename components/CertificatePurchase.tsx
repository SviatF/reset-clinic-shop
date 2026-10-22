"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CERTIFICATE_DENOMINATIONS, certificateName, certificateSlug, type CertificatePurpose } from "@/lib/gift-certificates";

export default function CertificatePurchase() {
  const [purpose, setPurpose] = useState<CertificatePurpose>("shop");
  const [amount, setAmount] = useState<number>(CERTIFICATE_DENOMINATIONS[1]);
  const { add } = useCart();

  return (
    <section className="certificate-order-section shell" id="certificate-order" aria-labelledby="certificate-order-title">
      <div className="certificate-order-heading">
        <span className="editorial-kicker">RESET CLINIC · ПОДАРУНКОВИЙ СЕРТИФІКАТ</span>
        <h2 id="certificate-order-title">Подарунок, який дає свободу вибору.</h2>
        <p>Оберіть, на що саме діятиме сертифікат, і його номінал. Сертифікат для магазину та сертифікат для процедур — це два різні варіанти.</p>
        <span className="certificate-order-caption">Термін дії — 3 місяці з моменту придбання.</span>
      </div>

      <div className="certificate-order-form">
        <fieldset className="certificate-choose">
          <legend><span>01</span> На що подарунковий сертифікат?</legend>
          <div className="certificate-purpose-options">
            <label className={"certificate-purpose-choice " + (purpose === "shop" ? "selected" : "")}>
              <input type="radio" name="certificate-purpose" value="shop" checked={purpose === "shop"} onChange={() => setPurpose("shop")} />
              <span className="certificate-choice-tag">ONLINE · МАГАЗИН</span>
              <strong>На покупки в інтернет-магазині</strong>
              <span className="certificate-choice-desc">Для придбання професійної косметики в онлайн-магазині RESET Clinic.</span>
            </label>
            <label className={"certificate-purpose-choice " + (purpose === "clinic" ? "selected" : "")}>
              <input type="radio" name="certificate-purpose" value="clinic" checked={purpose === "clinic"} onChange={() => setPurpose("clinic")} />
              <span className="certificate-choice-tag">OFFLINE · КЛІНІКА</span>
              <strong>На процедури в клініці</strong>
              <span className="certificate-choice-desc">Для оплати процедур під час відвідування RESET Clinic. Запис узгоджується окремо.</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="certificate-choose">
          <legend><span>02</span> Оберіть номінал</legend>
          <div className="certificate-denomination-options">
            {CERTIFICATE_DENOMINATIONS.map((value) => (
              <label className={"certificate-denomination " + (amount === value ? "selected" : "")} key={value}>
                <input type="radio" name="certificate-amount" value={value} checked={amount === value} onChange={() => setAmount(value)} />
                <span>{value.toLocaleString("uk-UA")} <small>₴</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="certificate-order-summary">
          <div>
            <span>ВИБРАНИЙ СЕРТИФІКАТ</span>
            <strong>{purpose === "shop" ? "Покупки в інтернет-магазині" : "Процедури в клініці"}</strong>
            <b>{amount.toLocaleString("uk-UA")} ₴</b>
          </div>
          <button type="button" className="black-button certificate-buy-button" onClick={() => add({ slug: certificateSlug(amount, purpose), name: certificateName(amount, purpose), price: amount })}>
            ДОДАТИ ДО КОШИКА <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className="certificate-order-footnote">Призначення сертифіката фіксується в замовленні та не змінюється при оформленні. Після оплати отримання сертифіката узгоджується з клінікою.</p>
      </div>
    </section>
  );
}
