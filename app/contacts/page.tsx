import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import interierImg from "@/assets/img/interier.webp";
import teamImg from "@/assets/img/reset-team-doctors.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Контакти — RESET Clinic", description: "RESET Clinic у Львові: вул. Кульпарківська, 93/2, телефон +380 (93) 282 88 88.", alternates: { canonical: "/contacts" } };
export const dynamic = "force-dynamic";

export default function ContactsPage() {
  return (
    <div className="inner-page contacts-page">
      <section className="contacts-hero shell">
        <div className="contacts-copy"><span className="editorial-kicker">ОФЛАЙН ~ МАГАЗИН</span><h1>Зайдіть не просто за косметикою. Зайдіть за точним вибором.</h1><p>RESÉT Clinic · Львів<br/>вул. Кульпарківська, 93/2</p><a className="contact-phone" href="tel:+380932828888">+380 (93) 282 88 88</a><div className="contact-actions"><a className="black-button" href="https://www.google.com/maps/search/?api=1&query=%D0%9A%D1%83%D0%BB%D1%8C%D0%BF%D0%B0%D1%80%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%B0+93%2F2+%D0%9B%D1%8C%D0%B2%D1%96%D0%B2" target="_blank" rel="noreferrer">Прокласти маршрут <Arrow /></a><Link className="text-link" href="/clients/faq">Перед візитом: FAQ →</Link></div></div>
        <div className="contacts-image"><Image src={interierImg} alt="Інтер’єр RESET Clinic у Львові" priority /></div>
      </section>

      <section className="contacts-info shell"><div><span>01</span><h3>Самовивіз</h3><p>Замовте онлайн і заберіть готове замовлення у клініці.</p></div><div><span>02</span><h3>Підбір на місці</h3><p>Якщо сумніваєтесь у засобі — уточніть сумісність і схему використання.</p></div><div><span>03</span><h3>Зв’язок</h3><p><a href="mailto:reset.clinic.lviv@gmail.com">reset.clinic.lviv@gmail.com</a><br/><a href="tel:+380932828888">+380 (93) 282 88 88</a></p></div></section>

      <section className="map-section shell"><iframe title="RESET Clinic на карті" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%20%D0%B2%D1%83%D0%BB.%20%D0%9A%D1%83%D0%BB%D1%8C%D0%BF%D0%B0%D1%80%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%B0%2C%2093%2F2&z=14&output=embed" /></section>

      <section className="team-contact shell"><div className="team-contact-image"><Image src={teamImg} alt="Команда RESET Clinic" /></div><div><span className="editorial-kicker">ВАШ ДОГЛЯД НЕ ЗАКІНЧУЄТЬСЯ НА КАСІ</span><h2>За кожною рекомендацією — реальна команда.</h2><p>Напишіть або приходьте, якщо потрібно перевірити схему, замінити актив чи зрозуміти, як адаптувати догляд до сезону.</p><a className="black-button" href="tel:+380932828888">Зателефонувати <Arrow /></a></div></section>
      <TrustStrip />
    </div>
  );
}
