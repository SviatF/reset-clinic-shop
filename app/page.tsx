import Image from "next/image";
import Link from "next/link";
import hero from "@/assets/img/hero-ph.webp";
import bodyImg from "@/assets/img/body.webp";
import faceImg from "@/assets/img/face.webp";
import hairImg from "@/assets/img/hair.webp";
import productImg from "@/assets/img/tovar1.webp";
import block1 from "@/assets/img/block1.webp";
import block2 from "@/assets/img/block2.webp";
import block3 from "@/assets/img/block3.webp";
import { product, productHref } from "@/lib/product";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Arrow() {
  return <svg viewBox="0 0 42 16" aria-hidden="true"><path d="M0 8h38M31 1l7 7-7 7" /></svg>;
}

function MiniIcon({ type }: { type: "truck" | "bag" | "check" | "heart" }) {
  if (type === "truck") return <svg viewBox="0 0 42 42" aria-hidden="true"><path d="M3 11h23v20H3zM26 19h7l6 6v6H26z"/><circle cx="11" cy="32" r="4"/><circle cx="32" cy="32" r="4"/></svg>;
  if (type === "bag") return <svg viewBox="0 0 42 42" aria-hidden="true"><path d="M12 12h18l5 7-4 18H11L7 19z"/><path d="M16 12c0-4 2-7 5-7s5 3 5 7M21 17v15M16 22h7c4 0 4 5 0 5h-4"/></svg>;
  if (type === "heart") return <svg viewBox="0 0 42 42" aria-hidden="true"><path d="M21 35S6 27 6 16c0-6 8-10 15-2 7-8 15-4 15 2 0 11-15 19-15 19Z"/></svg>;
  return <svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="16"/><path d="m13 21 5 5 11-12"/></svg>;
}

const recommendations = Array.from({ length: 8 });

export default function HomePage() {
  return (
    <>
      <section className="hero" id="home">
        <Image className="hero-bg" src={hero} alt="Професійні засоби RESET Clinic" fill priority sizes="100vw" />
        <div className="shell hero-shell">
          <div className="hero-card">
            <h1>Ваша шкіра — під<br />професійним наглядом</h1>
            <p>Добірка найкращих професійних засобів для здоров&apos;я вашої шкіри. Консультуємо, підбираємо та допомагаємо досягти видимого результату.</p>
            <Link className="black-button" href="/catalog">Перейти в каталог <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="benefit-strip" id="benefits">
        <div className="shell benefit-grid">
          <div className="benefit"><MiniIcon type="truck"/><div><strong>БЕЗКОШТОВНА ДОСТАВКА</strong><span>На всі замовлення від 5000 грн</span></div></div>
          <div className="benefit"><MiniIcon type="bag"/><div><strong>НАКОПИЧУЙТЕ КЕШБЕК</strong><span>Розраховуйтесь ними за наступні замовлення</span></div></div>
          <div className="benefit"><MiniIcon type="check"/><div><strong>ОФІЦІЙНА ГАРАНТІЯ</strong><span>Всі засоби сертифіковані та офіційні</span></div></div>
        </div>
      </section>

      <section className="categories-section">
        <div className="categories-shell shell">
          <h2>Оберіть<br />категорію</h2>
          <Link href="/catalog?category=body" className="category-card body-card" id="body">
            <Image src={bodyImg} alt="Тіло" sizes="(max-width: 768px) 86vw, 330px" />
            <strong>ТІЛО</strong>
          </Link>
          <Link href="/catalog?category=face" className="category-card face-card" id="face">
            <Image src={faceImg} alt="Обличчя" sizes="(max-width: 768px) 86vw, 330px" />
            <strong>ОБЛИЧЧЯ</strong>
          </Link>
          <Link href="/catalog?category=hair" className="category-card hair-card" id="hair">
            <Image src={hairImg} alt="Волосся" sizes="(max-width: 768px) 86vw, 330px" />
            <strong>ВОЛОССЯ</strong>
          </Link>
        </div>
      </section>

      <section className="recommend-section">
        <div className="cream-mark" aria-hidden="true" />
        <div className="shell recommend-shell">
          <h2>Рекомендуємо</h2>
          <div className="tabs" aria-label="Категорії рекомендацій"><button className="selected">ХІТИ ПРОДАЖ</button><button>НОВЕ</button><button>ТРЕНДОВЕ</button></div>
          <div className="products-grid">
            {recommendations.map((_, index) => (
              <Link className="product-card" href={productHref} key={index}>
                <div className="product-image"><Image src={productImg} alt={product.name} sizes="(max-width: 700px) 44vw, 250px" /></div>
                <div className="product-copy"><strong>{product.name.toUpperCase()}</strong><span>{product.price}.00₴</span></div>
              </Link>
            ))}
          </div>
          <Link className="black-button centered-button" href="/catalog">Дивитись усі <Arrow /></Link>
        </div>
      </section>

      <section className="promo-section" id="about">
        <div className="shell promo-shell">
          <div className="promo-grid">
            <article className="promo-card promo-green">
              <div className="promo-copy"><span>НОВІ НАДХОДЖЕННЯ</span><h3>Зимовий догляд за<br />шкірою Aesop</h3><Link className="light-button" href={productHref}>Обрати зараз <Arrow /></Link></div>
              <Image src={block1} alt="Нові надходження Aesop" />
            </article>
            <article className="promo-card promo-pink">
              <div className="promo-copy"><span>ПРЕДСТАВЛЕНИЙ БРЕНД</span><h3>Інтенсивний догляд за<br />шкірою сяйва</h3><Link className="light-button" href={productHref}>Отримати <Arrow /></Link></div>
              <Image src={block2} alt="Представлений бренд" />
            </article>
          </div>
          <div className="editorial-row">
            <div className="editorial-copy">
              <h3>Ваша шкіра — під<br />професійним наглядом</h3>
              <p>Добірка найкращих професійних засобів для здоров&apos;я вашої шкіри.</p>
              <p>Консультуємо, підбираємо та допомагаємо досягти видимого результату.</p>
              <Link className="black-button" href="/catalog">Переглянути каталог <Arrow /></Link>
            </div>
            <div className="editorial-image">
              <Image src={block3} alt="Професійний догляд RESET Clinic" />
              <svg className="circle-copy" viewBox="0 0 180 180" aria-hidden="true"><defs><path id="copycircle" d="M90,90 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0" /></defs><text><textPath href="#copycircle">YOUR SKIN • HAIR • BODY • BEST FOR • </textPath></text></svg>
            </div>
          </div>
        </div>
      </section>

      <section className="service-strip">
        <div className="shell service-grid">
          <div className="service-item"><MiniIcon type="bag"/><div><strong>ПРОГРАМА ЛОЯЛЬНОСТІ</strong><span>Накопичувальні знижки, персональні подарунки та святкові бонуси для постійних покупців.</span></div></div>
          <div className="service-item"><MiniIcon type="heart"/><div><strong>ПІДТРИМКА КОСМЕТОЛОГА</strong><span>Професійні консультації та допомога у підборі догляду в будь-який зручний час.</span></div></div>
          <div className="service-item"><MiniIcon type="check"/><div><strong>ВИГІДНІ ПОКУПКИ</strong><span>Додаткові спеціальні пропозиції, персональні знижки та акції на улюблені товари.</span></div></div>
        </div>
      </section>
    </>
  );
}
