"use client";

import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import CheckoutForm from "@/components/CheckoutForm";
import { useCart } from "@/components/CartProvider";

const FREE_SHIPPING = 5000;

export default function CheckoutPage() {
  const { items, total } = useCart();
  const shipping = total >= FREE_SHIPPING || !items.length ? 0 : null;

  return (
    <section className="checkout-page">
      <div className="shell checkout-shell">
        <div className="checkout-top"><h1>Оформлення</h1><Link href="/face">← Продовжити покупки</Link></div>
        <div className="checkout-grid">
          <CheckoutForm />
          <aside className="checkout-summary">
            <h2>Ваше замовлення</h2>
            {!items.length ? <p>Кошик порожній. Додайте товар перед оформленням.</p> : items.map((item) => (
              <div className="checkout-order-row" key={item.slug}>
                <Image src={productImg} alt={item.name} />
                <div><Link href={`/product/${item.slug}`}>{item.name}</Link><span>Кількість: {item.qty}</span></div>
                <strong>{(item.price * item.qty).toFixed(2)}₴</strong>
              </div>
            ))}
            <div className="checkout-totals">
              <div><span>Товари</span><span>{total.toFixed(2)}₴</span></div>
              <div><span>Доставка</span><span>{shipping === 0 ? "Безкоштовно / уточнюється" : "за тарифом"}</span></div>
              <div className="grand"><span>Разом</span><span>{total.toFixed(2)}₴</span></div>
            </div>
            <div className="drawer-consultation">
              <span>ПЕРЕД ОПЛАТОЮ</span>
              <p>Якщо у вас активний догляд із кислотами, ретиноїдами або кількома сироватками — перевірте сумісність із косметологом.</p>
              <Link href="/consultation">Перевірити догляд →</Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
