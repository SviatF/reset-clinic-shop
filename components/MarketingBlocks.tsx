import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import productImg from "@/assets/img/tovar1.webp";
import consultationImg from "@/assets/img/consultation.webp";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import { product, productHref } from "@/lib/product";

export function Arrow() {
  return <svg viewBox="0 0 42 16" aria-hidden="true"><path d="M1 8h37M32 2l6 6-6 6" /></svg>;
}

export function ProductGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="category-product-grid">
      {Array.from({ length: count }).map((_, index) => (
        <Link className="product-card category-product-card" href={productHref} key={index}>
          <div className="product-image"><Image src={productImg} alt={product.name} /></div>
          <div className="product-copy"><strong>{product.name.toUpperCase()}</strong><span>{product.price}.00₴</span></div>
        </Link>
      ))}
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

export function CategoryLanding({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: StaticImageData;
  imageAlt: string;
  tone: "face" | "body" | "hair";
}) {
  return (
    <div className={`category-landing category-tone-${tone}`}>
      <section className="category-hero shell">
        <div className="category-hero-copy">
          <span className="editorial-kicker">{eyebrow} ~ RESET</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="category-hero-actions">
            <Link className="black-button" href="#products">Дивитися засоби <Arrow /></Link>
            <Link className="text-link" href="/contacts">Попросити підбір →</Link>
          </div>
          <div className="category-proof-line"><b>Професійний догляд</b><span>•</span><span>Оригінальність</span><span>•</span><span>Консультація</span></div>
        </div>
        <div className="category-hero-visual">
          <Image src={image} alt={imageAlt} priority />
          <div className="floating-note">Підібрано<br/>під потреби<br/>вашої шкіри</div>
        </div>
      </section>

      <section className="category-products" id="products">
        <div className="shell">
          <div className="section-heading split-heading">
            <div><span>КАТАЛОГ ~ {eyebrow}</span><h2>Точний догляд.<br/>Без зайвого.</h2></div>
            <p>Зараз у каталозі один тестовий продукт. Структура готова до підключення повного асортименту без зміни дизайну.</p>
          </div>
          <ProductGrid />
        </div>
      </section>

      <section className="consultation-sell shell">
        <div className="consultation-image"><Image src={consultationImg} alt="Консультація косметолога RESET Clinic" /></div>
        <div className="consultation-copy">
          <span className="editorial-kicker">НЕ ВПЕВНЕНІ У ВИБОРІ?</span>
          <h2>Не вгадуйте.<br/>Запитайте косметолога.</h2>
          <p>Професійні активи дають кращий результат, коли підібрані під конкретний стан шкіри, ваші звички та вже наявний догляд.</p>
          <Link className="black-button" href="/contacts">Отримати рекомендацію <Arrow /></Link>
          <div className="micro-proof"><Image src={buyInHandImg} alt="Передача професійної косметики клієнту" /><span>Підбір → перевірка сумісності → зрозуміла схема використання</span></div>
        </div>
      </section>
      <TrustStrip />
    </div>
  );
}
