import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import consultationImg from "@/assets/img/consultation.webp";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import PremiumProductCard from "@/components/PremiumProductCard";
import { getStoreProducts } from "@/lib/store-products";

export function Arrow() {
  return <svg viewBox="0 0 42 16" aria-hidden="true"><path d="M1 8h37M32 2l6 6-6 6" /></svg>;
}

export async function ProductGrid({ count = 8, category }: { count?: number; category?: "face" | "body" | "hair" }) {
  const products = await getStoreProducts({ category, limit: count });
  const visible = products.length === 1 ? Array.from({ length: count }, () => products[0]) : products.slice(0, count);
  return (
    <div className="category-product-grid">
      {visible.map((item, index) => <PremiumProductCard key={`${item.slug}-${index}`} index={index + 1} productData={item} />)}
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="page-trust-strip">
      <div className="shell page-trust-grid">
        <div><span>01</span><strong>Оригінальні засоби</strong><p>Працюємо з офіційними представниками та перевіреними поставками.</p></div>
        <div><span>02</span><strong>Підбір косметолога</strong><p>Допомагаємо зібрати догляд, у якому активи працюють разом, а не конфліктують.</p></div>
        <div><span>03</span><strong>Контроль результату</strong><p>Не залишаємо вас наодинці з баночками — коригуємо схему за потреби.</p></div>
      </div>
    </section>
  );
}

const problemMap = {
  face: ["Сухість", "Чутливість", "Пігментація", "Висипання", "Текстура", "Перші вікові зміни", "SPF"],
  body: ["Сухість", "Відновлення бар’єру", "Текстура", "Чутливість", "Щоденне зволоження", "Догляд після процедур"],
  hair: ["Сухість довжини", "Чутлива шкіра голови", "Ламкість", "Блиск", "Щоденний догляд", "Захист довжини"],
} as const;

export function CategoryLanding({ eyebrow, title, description, image, imageAlt, tone }: { eyebrow: string; title: string; description: string; image: StaticImageData; imageAlt: string; tone: "face" | "body" | "hair"; }) {
  const problems = problemMap[tone];
  return (
    <div className={`category-landing category-tone-${tone}`}>
      <section className="category-hero shell">
        <div className="category-hero-copy">
          <span className="editorial-kicker">{eyebrow} ~ RESET</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="category-hero-actions"><Link className="black-button" href="#products">Дивитися засоби <Arrow /></Link><Link className="text-link" href="/consultation">Попросити підбір →</Link></div>
          <div className="problem-discovery"><span>ПОЧНІТЬ НЕ З БАНОЧКИ, А З ПОТРЕБИ</span><div className="problem-chip-list">{problems.map((problem) => <Link key={problem} href="/consultation" className="problem-chip">{problem}</Link>)}</div></div>
          <div className="category-proof-line"><b>Професійний догляд</b><span>•</span><span>Оригінальність</span><span>•</span><span>Консультація</span></div>
        </div>
        <div className="category-hero-visual"><Image src={image} alt={imageAlt} priority /><div className="floating-note">Підібрано<br/>під потреби<br/>вашої шкіри</div></div>
      </section>
      <section className="category-products" id="products">
        <div className="shell"><div className="section-heading split-heading"><div><span>КАТАЛОГ ~ {eyebrow}</span><h2>Точний догляд.<br/>Без зайвого.</h2></div><p>Асортимент керується з RESET Commerce Admin: активні товари, ціни та залишки оновлюються без зміни дизайну сайту.</p></div><ProductGrid category={tone} /></div>
      </section>
      <section className="consultation-sell shell">
        <div className="consultation-image"><Image src={consultationImg} alt="Консультація косметолога RESET Clinic" /></div>
        <div className="consultation-copy">
          <span className="editorial-kicker">НЕ ВПЕВНЕНІ У ВИБОРІ?</span><h2>Не вгадуйте.<br/>Запитайте косметолога.</h2><p>Професійні активи дають кращий результат, коли підібрані під конкретний стан шкіри, ваші звички та вже наявний догляд.</p>
          <div className="consultation-actions"><Link className="black-button" href="/consultation">Пройти короткий підбір <Arrow /></Link><Link className="text-link" href="/contacts">Одразу написати косметологу →</Link></div>
          <div className="micro-proof"><Image src={buyInHandImg} alt="Передача професійної косметики клієнту" /><span>Підбір → перевірка сумісності → зрозуміла схема використання</span></div>
        </div>
      </section>
      <TrustStrip />
    </div>
  );
}
