import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import certificateMain from "@/assets/img/main-certificate.webp";
import interierImg from "@/assets/img/interier.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";
import CertificatePurchase from "@/components/CertificatePurchase";

export const metadata: Metadata = { title: "Універсальний подарунковий сертифікат — RESET Clinic", description: "Єдиний подарунковий сертифікат RESET Clinic на професійну косметику та процедури в клініці. Номінали від 1 500 до 20 000 грн.", alternates: { canonical: "/certificate" } };
export const dynamic = "force-dynamic";

export default function CertificatePage() {
  return (
    <div className="inner-page certificate-page">
      <section className="certificate-hero shell">
        <div className="certificate-copy"><span className="editorial-kicker">ПОДАРУНОК ~ БЕЗ РИЗИКУ НЕ ВГАДАТИ</span><h1>Даруйте не баночку. Даруйте правильний вибір.</h1><p>Один універсальний подарунковий сертифікат RESET Clinic на професійну косметику та процедури в клініці. Просто оберіть номінал — отримувач сам вирішить, як скористатися подарунком.</p><Link className="black-button" href="#certificate-order">Обрати номінал <Arrow /></Link><small>Термін дії — 3 місяці з моменту придбання.</small></div>
        <div className="certificate-art certificate-art-single"><Image src={certificateMain} alt="Універсальний подарунковий сертифікат RESET Clinic" priority /></div>
      </section>
      <CertificatePurchase />
      <section className="certificate-steps shell"><div><span>01</span><h3>Оберіть номінал</h3><p>7 варіантів від 1 500 до 20 000 грн.</p></div><div><span>02</span><h3>Оформіть замовлення</h3><p>Вкажіть контактні дані й спосіб отримання сертифіката.</p></div><div><span>03</span><h3>Подаруйте свободу вибору</h3><p>Сертифікатом можна скористатися для придбання косметики або процедур у RESET Clinic.</p></div></section>
      <section className="certificate-place shell"><div className="certificate-place-image"><Image src={interierImg} alt="Інтер’єр RESET Clinic" /></div><div><span className="editorial-kicker">RESÉT CLINIC · ЛЬВІВ</span><h2>Подарунок, за яким стоїть команда фахівців.</h2><p>Ми не просто видаємо сертифікат — допомагаємо перетворити його на корисний досвід і персонально підібраний догляд.</p><Link className="text-link" href="/contacts">Зв’язатися з нами →</Link></div></section>
      <TrustStrip />
    </div>
  );
}
