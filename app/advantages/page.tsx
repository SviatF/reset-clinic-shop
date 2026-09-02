import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import certMain from "@/assets/img/certificak-main2.webp";
import certSecond from "@/assets/img/certificat-second.webp";
import partnersImg from "@/assets/img/our-partners.webp";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Переваги RESET Clinic", description: "Сертифікована оригінальність, доказова ефективність, експертний підбір та контроль якості.", alternates: { canonical: "/advantages" } };
export const dynamic = "force-dynamic";

const benefits = [
  ["01", "Сертифікована оригінальність", "Працюємо безпосередньо з офіційними дистриб’юторами світових брендів. Кожен засіб має підтверджене походження та правильні умови зберігання."],
  ["02", "Доказова ефективність", "У каталозі — продукти з активними компонентами та зрозумілою логікою дії. Не женемося за хайпом, якщо за ним немає результату."],
  ["03", "Експертний підбір косметолога", "Професійний засіб може нашкодити, якщо підібраний неправильно. Тому ми допомагаємо поєднати активи у безпечну щоденну схему."],
  ["04", "Безпека та контроль якості", "Стежимо за термінами придатності, температурним режимом та цілісністю упаковки — від поставки до моменту, коли товар опиняється у ваших руках."],
] as const;

export default function AdvantagesPage() {
  return (
    <div className="inner-page advantages-page">
      <section className="advantages-hero shell">
        <div><span className="editorial-kicker">НАШІ ~ ПЕРЕВАГИ</span><h1>Професійна косметика — інвестиція у здоров’я вашої шкіри.</h1><p>Ми поєднали магазин, експертність клініки та контроль якості в одному досвіді покупки.</p><Link className="black-button" href="/catalog">Купувати професійно <Arrow /></Link></div>
        <div className="cert-stack"><Image className="cert-one" src={certMain} alt="Сертифікат RESET Clinic" /><Image className="cert-two" src={certSecond} alt="Підтвердження сертифікації" /></div>
      </section>

      <section className="benefits-ledger shell">
        <div className="ledger-title"><span>НІЯКОГО ШУМУ У КРАСІ</span><h2>Формула чистого вибору.</h2></div>
        <div className="ledger-list">{benefits.map(([num, title, text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="proof-banner shell"><div className="proof-banner-image"><Image src={buyInHandImg} alt="Косметика RESET Clinic у руках клієнта" /></div><div className="proof-banner-copy"><span>ВІД ПЕРЕВІРКИ ДО ВАШОЇ ПОЛИЧКИ</span><h2>Контроль якості — не напис на сайті, а процес.</h2><p>Перевіряємо продукт до відправки, консультуємо до покупки й залишаємося на зв’язку після неї.</p><Link className="text-link" href="/clients/delivery">Як ми доставляємо →</Link></div></section>

      <section className="partners-section shell"><div><span className="editorial-kicker">НАШІ ПАРТНЕРИ</span><h2>Бренди, з якими можна будувати довгостроковий догляд.</h2></div><div className="partners-image"><Image src={partnersImg} alt="Партнери RESET Clinic" /></div></section>
      <TrustStrip />
    </div>
  );
}
