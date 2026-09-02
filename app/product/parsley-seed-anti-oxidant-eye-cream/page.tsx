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

export default function ProductPage() {
  return (
    <div className="product-page-conversion product-page-premium">
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

                <div className="product-object-note">
                  <span>CLINICAL EDIT</span>
                  <strong>Делікатна зона</strong>
                  <p>Антиоксидантний догляд</p>
                </div>

                <div className="product-object-footer">
                  <span>FACE CARE</span>
                  <span>ANTI-OXIDANT</span>
                  <span>RESET CLINIC</span>
                </div>
              </div>
            </div>

            <div className="product-detail-panel product-premium-detail">
              <span className="eyebrow">ДОГЛЯД ЗА ОБЛИЧЧЯМ · ЗОНА НАВКОЛО ОЧЕЙ</span>
              <h1>{product.name}</h1>
              <p className="product-benefit-lead">Комфортний антиоксидантний догляд для делікатної зони навколо очей.</p>

              <div className="product-quick-facts">
                <div><span>01</span><strong>Зволоження</strong></div>
                <div><span>02</span><strong>Комфорт</strong></div>
                <div><span>03</span><strong>Антиоксидантний фокус</strong></div>
              </div>

              <div className="product-purchase-deck">
                <div className="product-price-row product-price-card">
                  <div>
                    <span className="product-price-label">ЦІНА</span>
                    <strong>{product.price}.00₴</strong>
                  </div>
                  <small>Офіційний продукт<br/>контроль зберігання</small>
                </div>

                <ProductActions />
                <div className="product-shipping-line"><span>ДОСТАВКА</span><strong>Безкоштовно від 5000 грн</strong></div>
              </div>

              <div className="product-assurance-grid product-assurance-premium">
                <div><b>ОРИГІНАЛЬНІСТЬ</b><span>Офіційні поставки.</span></div>
                <div><b>ПІДБІР</b><span>Перевіримо сумісність.</span></div>
                <div><b>ПІДТРИМКА</b><span>Допоможемо після покупки.</span></div>
                <div><b>ОТРИМАННЯ</b><span>Нова Пошта або самовивіз.</span></div>
              </div>

              <div className="consult-inline product-consult-card">
                <div><span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span><strong>Перевірте засіб перед покупкою.</strong></div>
                <Link href="/consultation">Підібрати догляд →</Link>
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
            <article><span>02</span><div><strong>Антиоксидантний фокус</strong><p>Підтримка доглянутого вигляду та відчуття комфорту.</p></div></article>
            <article><span>03</span><div><strong>Сумісність важлива</strong><p>Активну схему краще перевірити перед покупкою.</p></div></article>
          </div>
        </div>
      </section>

      <section className="product-story product-story-premium">
        <div className="shell">
          <div className="product-story-heading"><span>КЛЮЧОВЕ ПРО ПРОДУКТ</span><h2>Менше тексту.<br/>Більше ясності.</h2></div>
          <div className="product-story-grid">
            <article className="product-story-card"><span>01 · КОЛИ</span><div><h3>Коли потрібен комфортний окремий етап.</h3><p>Без складної багатошарової схеми.</p></div></article>
            <article className="product-story-card product-story-card-accent"><span>02 · ФОКУС</span><div><h3>Зволоження + антиоксидантний догляд.</h3><p>Для підтримки делікатної зони.</p></div></article>
            <article className="product-story-card"><span>03 · ВАЖЛИВО</span><div><h3>Не комбінуйте активи навмання.</h3><p>Перевірте сумісність із поточною рутиною.</p></div></article>
          </div>
        </div>
      </section>

      <section className="routine-section routine-section-premium">
        <div className="shell">
          <div className="routine-head"><span>RESET ROUTINE</span><h2>Місце продукту у вашій системі.</h2><p>Базова логіка нанесення. Персональну схему за потреби скоригує косметолог RESET.</p></div>
          <div className="routine-steps">
            <div className="routine-step"><span>КРОК 01</span><strong>Очищення</strong><p>Підготуйте шкіру.</p></div>
            <div className="routine-step"><span>КРОК 02</span><strong>Актив / сироватка</strong><p>Якщо є у вашій схемі.</p></div>
            <div className="routine-step is-current"><span>КРОК 03 · ЦЕЙ ПРОДУКТ</span><strong>Зона навколо очей</strong><p>Наносьте делікатно.</p></div>
            <div className="routine-step"><span>КРОК 04</span><strong>Крем / SPF</strong><p>Завершіть рутину.</p></div>
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
