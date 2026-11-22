"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { certificateFromSlug, isLegacyCertificateSlug } from "@/lib/certificate-products";
import { earnedCartBenefits, physicalCartSubtotal } from "@/lib/cart-benefits";

export default function CheckoutForm() {
  const { items, total, clear } = useCart();
  const legacyCertificateInCart = items.some(item => isLegacyCertificateSlug(item.slug));
  const [delivery, setDelivery] = useState("nova");
  const [paymentMethod, setPaymentMethod] = useState<"monobank" | "cash_on_pickup">("monobank");
  const cashRequestIdRef = useRef<string | null>(null);
  const cashSelected = delivery === "pickup" && paymentMethod === "cash_on_pickup";
  const hasCertificate = items.some(item => certificateFromSlug(item.slug) !== null);
  const earnedBenefits = earnedCartBenefits(physicalCartSubtotal(items));
  const freeShipping = earnedBenefits.includes("Безкоштовна доставка");
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!items.length || isPaying || legacyCertificateInCart) return;

    setError("");
    setIsPaying(true);

    const form = new FormData(e.currentTarget);
    const draft = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      city: String(form.get("city") || "").trim(),
      branch: String(form.get("branch") || "").trim(),
      comment: String(form.get("comment") || "").trim(),
      certificate_recipient_email: String(form.get("certificate_recipient_email") || "").trim(),
      certificate_message: String(form.get("certificate_message") || "").trim(),
      delivery,
      items,
      total,
      createdAt: new Date().toISOString(),
    };

    try {
      try { localStorage.setItem("reset-order-draft", JSON.stringify(draft)); } catch {}

      if (cashSelected) {
        if (!cashRequestIdRef.current) cashRequestIdRef.current = crypto.randomUUID();
        const response = await fetch("/api/orders/cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, clientRequestId: cashRequestIdRef.current }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok || !data?.orderNumber)
          throw new Error(data?.error || "Не вдалося зберегти замовлення");
        try {
          localStorage.setItem("reset-last-cash-order", JSON.stringify({
            orderNumber: data.orderNumber, amount: data.amount, createdAt: new Date().toISOString(),
            paymentMethod: "cash_on_pickup",
          }));
        } catch {}
        clear();
        cashRequestIdRef.current = null;
        window.location.assign(`/order/confirmed?number=${encodeURIComponent(data.orderNumber)}`);
        return;
      }

      const response = await fetch("/api/mono/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok || !data?.pageUrl || !data?.invoiceId) {
        throw new Error(data?.error || "Не вдалося створити рахунок для оплати");
      }
      localStorage.setItem("reset-mono-payment", JSON.stringify({
        invoiceId: data.invoiceId,
        reference: data.reference,
        amount: data.amount,
        pageUrl: data.pageUrl,
        appUrl: data.appUrl || null,
        createdAt: new Date().toISOString(),
      }));
      window.location.assign(data.pageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося оформити замовлення");
      setIsPaying(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={submit}>
      <section className="checkout-section">
        <h2>Контактні дані</h2>
        <div className="checkout-fields">
          <div className="checkout-field"><label htmlFor="name">Ім’я та прізвище</label><input id="name" name="name" required autoComplete="name" /></div>
          <div className="checkout-field"><label htmlFor="phone">Телефон</label><input id="phone" name="phone" required autoComplete="tel" placeholder="+380" /></div>
          <div className="checkout-field full"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" /></div>
        </div>
      </section>

      {hasCertificate && <section className="checkout-section">
        <h2>Дані для подарункового сертифіката</h2>
        <p className="checkout-certificate-note">Сертифікат універсальний — для косметики та процедур. Контакт одержувача й побажання можна залишити за бажанням. Формат вручення можна уточнити з менеджером.</p>
        <div className="checkout-fields">
          <div className="checkout-field full"><label htmlFor="certificate_recipient_email">Email одержувача (необов’язково)</label><input id="certificate_recipient_email" name="certificate_recipient_email" type="email" autoComplete="off" placeholder="recipient@example.com" /></div>
          <div className="checkout-field full"><label htmlFor="certificate_message">Побажання до сертифіката (необов’язково)</label><textarea id="certificate_message" name="certificate_message" maxLength={500} rows={2} placeholder="Коротке привітання для отримувача" /></div>
        </div>
      </section>}

      <section className="checkout-section">
        <h2>Доставка / отримання</h2>
        <div className="delivery-options">
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "nova"} onChange={() => { setDelivery("nova"); setPaymentMethod("monobank"); }} /><span><strong>Нова Пошта</strong><span>{freeShipping ? "Безкоштовно · відділення або поштомат · 1–3 робочі дні" : "Відділення або поштомат · 1–3 робочі дні"}</span></span></label>
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "courier"} onChange={() => { setDelivery("courier"); setPaymentMethod("monobank"); }} /><span><strong>Кур’єрська доставка</strong><span>{freeShipping ? "Безкоштовна адресна доставка" : "Адресна доставка за тарифами перевізника"}</span></span></label>
          <label className="delivery-option"><input type="radio" name="delivery" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} /><span><strong>Самовивіз із RESET Clinic</strong><span>Львів, вул. Кульпарківська, 93/2</span></span></label>
        </div>
        {delivery !== "pickup" && <div className="checkout-fields" style={{ marginTop: 14 }}>
          <div className="checkout-field"><label htmlFor="city">Місто</label><input id="city" name="city" required={delivery !== "pickup"} /></div>
          <div className="checkout-field"><label htmlFor="branch">Відділення / адреса</label><input id="branch" name="branch" required={delivery !== "pickup"} /></div>
        </div>}
      </section>

      {earnedBenefits.length > 0 && <p className="checkout-bonus-note"><strong>Бонуси цього замовлення:</strong> {earnedBenefits.join(" · ")}. Подарунки додамо під час комплектації.</p>}

      <section className="checkout-section checkout-payment-section">
        <h2>Оплата</h2>
        <div className="checkout-payment-options" role="radiogroup" aria-label="Спосіб оплати">
          <label className={`mono-payment-choice checkout-payment-option ${!cashSelected ? "is-selected" : ""}`}>
            <input type="radio" name="payment_method" value="monobank" checked={!cashSelected}
              onChange={() => setPaymentMethod("monobank")} />
            <div className="mono-payment-mark"><span>mono</span></div>
            <div><strong>Онлайн-оплата через monobank</strong><span>Картка · Apple Pay · Google Pay · monobank</span></div>
            <i aria-hidden="true">✓</i>
          </label>
          {delivery === "pickup" && <label className={`mono-payment-choice checkout-payment-option ${cashSelected ? "is-selected" : ""}`}>
            <input type="radio" name="payment_method" value="cash_on_pickup" checked={cashSelected}
              onChange={() => setPaymentMethod("cash_on_pickup")} />
            <div className="mono-payment-mark checkout-cash-mark" aria-hidden="true"><span>₴</span></div>
            <div><strong>Готівкою при самовивозі</strong><span>Оплатите на місці при отриманні — без онлайн-списання</span></div>
            <i aria-hidden="true">✓</i>
          </label>}
        </div>
        <p className="mono-payment-security">{cashSelected
          ? "Ми збережемо замовлення та зв’яжемося з вами для підтвердження готовності. Оплата готівкою у RESET Clinic при отриманні."
          : "Платіж проходить на захищеній сторінці monobank. RESET Clinic не отримує і не зберігає дані вашої картки."}</p>
        {cashSelected && hasCertificate && <p className="mono-payment-security">Подарунковий сертифікат активується лише після фактичної оплати на місці.</p>}
      </section>

      <section className="checkout-section">
        <h2>Коментар</h2>
        <div className="checkout-field full"><label htmlFor="comment">Побажання до замовлення</label><textarea id="comment" name="comment" placeholder="Наприклад, хочу уточнити сумісність із моїм поточним доглядом" /></div>
      </section>

      {legacyCertificateInCart && <p className="cert-cart-legacy" role="alert">У кошику є старий варіант сертифіката. Видаліть його та <Link href="/certificate#certificate-order">оберіть актуальний номінал універсального сертифіката</Link>.</p>}
      <button className="checkout-submit mono-checkout-submit" type="submit" disabled={!items.length || isPaying || legacyCertificateInCart}>
        {isPaying ? (cashSelected ? "ОФОРМЛЮЄМО ЗАМОВЛЕННЯ…" : "СТВОРЮЄМО БЕЗПЕЧНИЙ ПЛАТІЖ…") : cashSelected ? `ПІДТВЕРДИТИ ЗАМОВЛЕННЯ · ${total.toFixed(2)} грн` : `ОПЛАТИТИ ОНЛАЙН · ${total.toFixed(2)} грн`}
      </button>
      <p className="checkout-note">{cashSelected ? "Після підтвердження замовлення буде зареєстроване без оплати. Готівку сплатите під час самовивозу." : "Після натискання ви перейдете на офіційну платіжну сторінку monobank, а після оплати повернетеся в RESET Clinic."}</p>
      {error && <div className="checkout-success checkout-payment-error"><strong>{cashSelected ? "Замовлення не оформлено." : "Оплату не запущено."}</strong><br/>{error}</div>}
    </form>
  );
}
