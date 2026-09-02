import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import ProductActions from "@/components/ProductActions";
import RealTrustLayer from "@/components/RealTrustLayer";
import { product } from "@/lib/product";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${product.name} — RESET Clinic`,
  description: product.description,
  alternates: { canonical: `/product/${product.slug}` },
};

function FactIcon({ type }: { type: "drop" | "spark" | "eye" }) {
  if (type === "drop") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4C12.5 9.2 8 13.5 8 19a8 8 0 0 0 16 0c0-5.5-4.5-9.8-8-15Z"/><path d="M12 20.5c.7 2.1 2.1 3.2 4.3 3.5"/></svg>;
  if (type === "spark") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c.6 7.1 4 10.4 11 11-7 .6-10.4 4-11 11-.6-7-4-10.4-11-11 7-.6 10.4-3.9 11-11Z"/><path d="M25 4v6M22 7h6"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 16s4.8-7 13-7 13 7 13 7-4.8 7-13 7S3 16 3 16Z"/><circle cx="16" cy="16" r="3.6"/></svg>;
}

export default function ProductPage() {
  return (
    <div className="product-page-conversion product-page-premium product-page-audit-v2">
      <section className="product-conversion-hero product-object-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">Головна</Link><span>/</span><Link href="/face">Обличчя</Link><span>/</span><span>{product.name}</span></div>

          <div className="product-conversion-layout product-object-layout">
            <div className="product-gallery-panel product-object-gallery">
              <div className="product-gallery-main product-object-stage">
                <span className="product-gallery-tag">RESET SELECTION</span>
                <span className="product-object-index">01 / PRODUCT OBJECT</span>
                <span className="product-object-halo" aria-hidden="true" />
                <Image src={productImg} alt={product.name} priority />
                <div className="product-object-footer">
                  <span>FACE CARE</span>
                  <span>{product.size}</span>
                  <span>ANTI-OXIDANT</span>
                </div>
              </div>
            </div>

            <div className="product-detail-panel product-premium-detail">
              <span className="eyebrow">ДОГЛЯД ЗА ОБЛИЧЧЯМ · ЗОНА НАВКОЛО ОЧЕЙ</span>
              <h1>{product.name}</h1>
              <p className="product-benefit-lead">Антиоксидантний догляд для делікатної зони навколо очей із фокусом на зволоження та комфорт.</p>

              <div className="product-meta-strip">
                <span><b>{product.size}</b> ОБ’ЄМ</span>
                <span className="product-order-status"><i /> ДОСТУПНО ДО ЗАМОВЛЕННЯ</span>
                <span>ДЛЯ ШИРОКОГО СПЕКТРА ТИПІВ ШКІРИ</span>
              </div>

              <div className="product-quick-facts product-quick-facts-icons">
                <div><FactIcon type="drop"/><span>ЗВОЛОЖЕННЯ</span><strong>Підтримує комфорт делікатної зони</strong></div>
                <div><FactIcon type="spark"/><span>АНТИОКСИДАНТИ</span><strong>Вітаміни C + E</strong></div>
                <div><FactIcon type="eye"/><span>ТЕКСТУРА</span><strong>Насичений крем</strong></div>
              </div>

              <div className="product-consult-inline-v2">
                <div><span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span><strong>Перевіримо сумісність перед покупкою.</strong></div>
                <Link href="/consultation">Підібрати догляд →</Link>
              </div>

              <div className="product-purchase-deck product-purchase-deck-light">
                <div className="product-price-row product-price-card product-price-card-light">
                  <div>
                    <span className="product-price-label">ЦІНА</span>
                    <strong>{product.price}.00 <em>{product.displayCurrency}</em></strong>
                  </div>
                  <div className="product-price-side">
                    <span>{product.size}</span>
                    <small>Офіційний продукт · контроль зберігання</small>
                  </div>
                </div>

                <ProductActions />
                <div className="product-shipping-line"><span>ДОСТАВКА</span><strong>Безкоштовно від 5000 грн</strong></div>
              </div>

              <div className="product-detail-disclosures">
                <details>
                  <summary><span>Як застосовувати</span><b>+</b></summary>
                  <div className="product-disclosure-body"><p>{product.howToUse}</p><div><span>Кількість</span><strong>{product.dosage}</strong></div><div><span>Текстура</span><strong>{product.texture}</strong></div></div>
                </details>
                <details>
                  <summary><span>Ключові компоненти</span><b>+</b></summary>
                  <div className="product-disclosure-body"><p>{product.keyIngredients.join(" · ")}</p><div><span>Підходить</span><strong>{product.suitedTo}</strong></div><div><span>Відчуття</span><strong>{product.skinFeel}</strong></div></div>
                </details>
                <details>
                  <summary><span>Повний склад · INCI</span><b>+</b></summary>
                  <div className="product-disclosure-body product-inci"><p>{product.inci}</p><small>Склад виробника може оновлюватися. Перед використанням звіряйте інформацію на упаковці.</small></div>
                </details>
              </div>

              <div className="product-assurance-grid product-assurance-premium">
                <div><b>ОРИГІНАЛЬНІСТЬ</b><span>Офіційні поставки.</span></div>
                <div><b>ПІДБІР</b><span>Перевіримо сумісність.</span></div>
                <div><b>ПІДТРИМКА</b><span>Допоможемо після покупки.</span></div>
                <div><b>ОТРИМАННЯ</b><span>Нова Пошта або самовивіз.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-signature-band">
        <div className="shell product-signature-grid">
          <div>
            <span>RESET PRODUCT LOGIC</span>
            <h2>Один засіб.<br/>Чітка роль у схемі.</h2>
          </div>
          <div className="product-signature-points">
            <article><span>01</span><div><strong>Для делікатної зони</strong><p>Окремий етап догляду без перевантаження рутини.</p></div></article>
            <article><span>02</span><div><strong>Антиоксидантний фокус</strong><p>Вітаміни C та E у насиченій кремовій текстурі.</p></div></article>
            <article><span>03</span><div><strong>Сумісність важлива</strong><p>Активну схему краще перевірити перед покупкою.</p></div></article>
          </div>
        </div>
      </section>

      <section className="product-ritual-crosssell">
        <div className="shell">
          <div className="product-ritual-head"><span>ЗАВЕРШІТЬ РИТУАЛ</span><h2>Не набір баночок.<br/>Послідовна система.</h2><p>Повний асортимент ще підключається, тому зараз ми не підставляємо вигадані товари — натомість показуємо правильну логіку сумісного догляду.</p></div>
          <div className="product-ritual-grid">
            <Link href="/face" className="product-ritual-card"><span>01</span><strong>Очищення</strong><p>Підготуйте шкіру до наступних етапів.</p><b>Підібрати →</b></Link>
            <div className="product-ritual-card is-current"><span>02 · ЦЕЙ ПРОДУКТ</span><strong>Зона навколо очей</strong><p>{product.name}</p><b>{product.size}</b></div>
            <Link href="/consultation" className="product-ritual-card"><span>03</span><strong>Крем / SPF</strong><p>Завершальний етап підбирається під вашу схему.</p><b>Перевірити сумісність →</b></Link>
          </div>
        </div>
      </section>

      <RealTrustLayer />

      <section className="home-consult-cta">
        <div className="shell home-consult-inner"><div><span>НЕ ХОЧЕТЕ ВГАДУВАТИ?</span><h2>За 2 хвилини звузьте вибір і зрозумійте, що варто уточнити у косметолога.</h2></div><Link href="/consultation">Пройти підбір →</Link></div>
      </section>
    </div>
  );
}
