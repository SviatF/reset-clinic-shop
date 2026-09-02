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
    <div className="product-page-conversion">
      <section className="product-conversion-hero">
        <div className="shell">
          <div className="breadcrumbs"><Link href="/">Головна</Link><span>/</span><Link href="/face">Обличчя</Link><span>/</span><span>{product.name}</span></div>
          <div className="product-conversion-layout">
            <div className="product-gallery-panel">
              <div className="product-gallery-main">
                <span className="product-gallery-tag">ПРОФЕСІЙНИЙ ДОГЛЯД · RESET SELECTION</span>
                <Image src={productImg} alt={product.name} priority />
              </div>
            </div>

            <div className="product-detail-panel">
              <span className="eyebrow">ДОГЛЯД ЗА ОБЛИЧЧЯМ · ЗОНА НАВКОЛО ОЧЕЙ</span>
              <h1>{product.name}</h1>
              <p className="product-benefit-lead">Антиоксидантний крем для делікатної зони навколо очей. Фокус — комфорт, зволоженість і доглянутий вигляд шкіри без перевантаженої рутини.</p>
              <div className="concern-pills"><span>Делікатна зона</span><span>Зволоження</span><span>Комфорт</span><span>Антиоксидантний догляд</span></div>
              <div className="product-price-row"><strong>{product.price}.00₴</strong><span>Офіційний продукт · контроль зберігання</span></div>
              <ProductActions />

              <div className="product-assurance-grid">
                <div><b>100% ОРИГІНАЛЬНІСТЬ</b><span>Працюємо з офіційними поставками та контрольованим зберіганням.</span></div>
                <div><b>ДОСТАВКА</b><span>Нова Пошта або самовивіз. Безкоштовно від 5000 грн.</span></div>
                <div><b>ПІДБІР КОСМЕТОЛОГА</b><span>Допоможемо перевірити, чи вписується засіб у вашу поточну схему.</span></div>
                <div><b>RESET SUPPORT</b><span>Після покупки можна уточнити порядок та частоту використання.</span></div>
              </div>

              <div className="consult-inline">
                <div><span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span><strong>Перевірте засіб перед покупкою.</strong></div>
                <Link href="/consultation">Підібрати догляд →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-story">
        <div className="shell">
          <div className="product-story-heading"><span>ПРОДУКТ ~ БЕЗ ЗАЙВОГО ШУМУ</span><h2>Що важливо знати перед тим, як додати засіб у щоденний догляд.</h2></div>
          <div className="product-story-grid">
            <article className="product-story-card"><span>01 · ДЛЯ КОГО</span><div><h3>Для делікатної зони навколо очей.</h3><p>Коли потрібен окремий комфортний етап догляду без складної багатошарової схеми.</p></div></article>
            <article className="product-story-card"><span>02 · ФОКУС</span><div><h3>Зволоженість + антиоксидантний догляд.</h3><p>Продукт створений для підтримки доглянутого вигляду та відчуття комфорту шкіри.</p></div></article>
            <article className="product-story-card"><span>03 · ПЕРЕД ПОКУПКОЮ</span><div><h3>Перевірте сумісність із вашою рутиною.</h3><p>Особливо якщо вже використовуєте активні сироватки, кислоти або ретиноїди.</p></div></article>
          </div>
        </div>
      </section>

      <section className="routine-section">
        <div className="shell">
          <div className="routine-head"><span>RESET ROUTINE</span><h2>Не окрема баночка. Частина послідовної системи.</h2><p>Порядок нанесення залежить від вашої схеми. Ми показуємо базову логіку, а косметолог може скоригувати її під ваші засоби.</p></div>
          <div className="routine-steps">
            <div className="routine-step"><span>КРОК 01</span><strong>Очищення</strong><p>М’яко підготуйте шкіру до наступних етапів.</p></div>
            <div className="routine-step"><span>КРОК 02</span><strong>Актив / сироватка</strong><p>Лише якщо цей етап уже є у вашій персональній схемі.</p></div>
            <div className="routine-step is-current"><span>КРОК 03 · ЦЕЙ ПРОДУКТ</span><strong>Догляд за зоною навколо очей</strong><p>Наносьте обережно, дотримуючись рекомендацій бренду та косметолога.</p></div>
            <div className="routine-step"><span>КРОК 04</span><strong>Крем / SPF</strong><p>Завершіть ранкову або вечірню рутину відповідно до потреб шкіри.</p></div>
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
