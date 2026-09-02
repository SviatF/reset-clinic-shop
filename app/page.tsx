import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import hero from "@/assets/img/hero-ph.webp";
import bodyImg from "@/assets/img/body.webp";
import faceImg from "@/assets/img/face.webp";
import hairImg from "@/assets/img/hair.webp";
import block1 from "@/assets/img/block1.webp";
import block2 from "@/assets/img/block2.webp";
import block3 from "@/assets/img/block3.webp";
import PremiumProductCard from "@/components/PremiumProductCard";
import { getStoreProducts } from "@/lib/store-products";

export const metadata: Metadata = {
  title: "Професійна косметика та підбір догляду",
  description: "Професійна косметика для обличчя, тіла та волосся від RESET Clinic у Львові. Оригінальна продукція, підбір косметолога та доставка по Україні.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Arrow() {
  return <svg viewBox="0 0 42 16" aria-hidden="true"><path d="M0 8h38M31 1l7 7-7 7" /></svg>;
}

const directions = [
  { href: "/face", image: faceImg, title: "Обличчя", note: "Щоденний догляд, активи та SPF" },
  { href: "/body", image: bodyImg, title: "Тіло", note: "Зволоження, відновлення та комфорт" },
  { href: "/hair", image: hairImg, title: "Волосся", note: "Шкіра голови, довжина та захист" },
];

export default async function HomePage() {
  let recommendations = await getStoreProducts({ featured: true, limit: 8 });
  if (!recommendations.length) recommendations = await getStoreProducts({ limit: 8 });
  const visibleProducts = recommendations.length === 1
    ? Array.from({ length: 8 }, () => recommendations[0])
    : recommendations;
  const featureHref = visibleProducts[0] ? `/product/${visibleProducts[0].slug}` : "/face";

  return (
    <>
      <section className="precision-hero" id="home">
        <div className="precision-hero-copy">
          <div className="precision-copy-inner">
            <span className="precision-eyebrow">RESET CLINIC SHOP</span>
            <h1>Професійний догляд.<br />Підібраний правильно.</h1>
            <p>Косметика для обличчя, тіла та волосся, яку ми відбираємо за професійними критеріями. Якщо не знаєте, що обрати — допоможе косметолог RESET.</p>
            <div className="precision-hero-actions">
              <Link className="precision-primary" href="/face">Обрати догляд <Arrow /></Link>
              <Link className="precision-secondary" href="/consultation">Підбір косметолога</Link>
            </div>
            <div className="precision-proof">
              <div><strong>100%</strong><span>оригінальна продукція</span></div>
              <div><strong>01</strong><span>професійний підбір</span></div>
              <div><strong>5000 ₴</strong><span>безкоштовна доставка від</span></div>
            </div>
          </div>
        </div>
        <div className="precision-hero-media">
          <Image src={hero} alt="Професійна косметика RESET Clinic" fill priority sizes="(max-width: 900px) 100vw, 56vw" />
          <div className="precision-image-label"><span>RESET CLINIC</span><b>Професійний догляд</b></div>
        </div>
      </section>

      <section className="precision-trustbar">
        <div className="shell precision-trustgrid">
          <div><span>01</span><strong>Офіційна продукція</strong><p>Перевірені поставки та контроль оригінальності.</p></div>
          <div><span>02</span><strong>Допомога косметолога</strong><p>Підбір засобів під потреби шкіри та вашу рутину.</p></div>
          <div><span>03</span><strong>Швидка доставка</strong><p>Нова Пошта, курʼєр або самовивіз із RESET Clinic.</p></div>
        </div>
      </section>

      <section className="precision-categories">
        <div className="shell">
          <div className="precision-section-head">
            <div><span>КАТЕГОРІЇ</span><h2>Оберіть напрямок</h2></div>
            <p>Швидкий старт без зайвої навігації. Оберіть зону догляду — далі допоможемо звузити вибір.</p>
          </div>
          <div className="precision-category-grid">
            {directions.map((item, index) => (
              <Link href={item.href} className="precision-category-card" key={item.href}>
                <div className="precision-category-image"><Image src={item.image} alt={item.title} sizes="(max-width: 700px) 100vw, 33vw" /><span>0{index + 1}</span></div>
                <div className="precision-category-info"><div><h3>{item.title}</h3><p>{item.note}</p></div><b>↗</b></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="precision-products">
        <div className="shell">
          <div className="precision-section-head precision-products-head">
            <div><span>RESET РЕКОМЕНДУЄ</span><h2>Засоби для щоденного догляду</h2></div>
            <Link href="/catalog">Переглянути каталог <b>↗</b></Link>
          </div>
          <div className="precision-filter-row"><button className="active">Рекомендовані</button><Link href="/face">Обличчя</Link><Link href="/catalog">Нове</Link></div>
          <div className="products-grid precision-product-grid">
            {visibleProducts.map((item, index) => <PremiumProductCard key={`${item.slug}-${index}`} index={index + 1} productData={item} />)}
          </div>
        </div>
      </section>

      <section className="precision-features">
        <div className="shell">
          <div className="precision-section-head"><div><span>ДОБІРКИ RESET</span><h2>Догляд без випадкових покупок</h2></div><p>Ми не намагаємось продати більше засобів. Завдання — зібрати зрозумілу систему, де кожен продукт має свою роль.</p></div>
          <div className="precision-feature-grid">
            <Link href={featureHref} className="precision-feature precision-feature-large">
              <Image src={block1} alt="Добірка професійної косметики" fill sizes="(max-width: 800px) 100vw, 62vw" />
              <div className="precision-feature-overlay"><span>НОВЕ В RESET</span><h3>Професійні засоби для холодного сезону</h3><b>Переглянути добірку ↗</b></div>
            </Link>
            <Link href="/face" className="precision-feature precision-feature-small">
              <Image src={block2} alt="Професійний догляд для сяйва" fill sizes="(max-width: 800px) 100vw, 38vw" />
              <div className="precision-feature-overlay"><span>ФОКУС</span><h3>Догляд для рівного тону та сяйва</h3><b>Переглянути ↗</b></div>
            </Link>
          </div>
        </div>
      </section>

      <section className="precision-consult">
        <div className="precision-consult-media"><Image src={block3} alt="Консультація та професійний догляд RESET Clinic" fill sizes="(max-width: 900px) 100vw, 50vw" /></div>
        <div className="precision-consult-copy">
          <span>НЕ ВПЕВНЕНІ У ВИБОРІ?</span>
          <h2>Не вгадуйте.<br />Запитайте косметолога.</h2>
          <p>Коротко опишіть потребу — ми допоможемо зрозуміти, які засоби доречні, як їх поєднати та в якій послідовності використовувати.</p>
          <Link className="precision-light-button" href="/consultation">Пройти підбір <Arrow /></Link>
          <Link className="precision-inline-link" href="/contacts">Звʼязатися з RESET →</Link>
        </div>
      </section>

      <section className="precision-bottom-services">
        <div className="shell precision-bottom-grid">
          <div><span>01</span><strong>Підбір</strong><p>Допомога з вибором і сумісністю засобів.</p></div>
          <div><span>02</span><strong>Доставка</strong><p>Зручний спосіб отримання замовлення по Україні.</p></div>
          <div><span>03</span><strong>Підтримка</strong><p>Можна повернутися з питанням після покупки.</p></div>
          <div><span>04</span><strong>Лояльність</strong><p>Переваги для постійних клієнтів RESET.</p></div>
        </div>
      </section>
    </>
  );
}
