import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import certificateMain from "@/assets/img/main-certificate.webp";
import interierImg from "@/assets/img/interier.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";
import CertificatePurchase from "@/components/CertificatePurchase";

export const metadata: Metadata = { title: "Подарунковий сертифікат — RESET Clinic", description: "Подарунковий сертифікат RESET Clinic на професійну косметику та послуги клініки.", alternates: { canonical: "/certificate" } };
export const dynamic = "force-dynamic";

export default function CertificatePage() {
  return (
    <div className="inner-page certificate-page">
      <section className="certificate-hero shell">
        <div className="certificate-copy"><span className="editorial-kicker">ПОДАРУНОК ~ БЕЗ РИЗИКУ НЕ ВГАДАТИ</span><h1>Даруйте не баночку. Даруйте правильний вибір.</h1><p>Обирайте подарунковий сертифікат на покупки в нашому інтернет-магазині або на процедури безпосередньо в клініці. Кожен сертифікат має своє призначення.</p><a className="black-button" href="#certificate-order">Обрати сертифікат <Arrow /></a><small>Термін дії — 3 місяці з моменту придбання.</small></div>
        <div className="certificate-art certificate-art-single"><Image src={certificateMain} alt="Основний подарунковий сертифікат RESET Clinic" priority /></div>
      </section>
      <CertificatePurchase />
      <section className="certificate-steps shell"><div><span>01</span><h3>Оберіть призначення</h3><p>На покупки в інтернет-магазині або на процедури офлайн у клініці.</p></div><div><span>02</span><h3>Оберіть номінал</h3><p>Вкажіть суму подарунка та оформіть замовлення через кошик.</p></div><div><span>03</span><h3>Скористайтеся подарунком</h3><p>Сертифікат діятиме лише в обраному напрямі: магазин або процедури клініки.</p></div></section>
      <section className="certificate-place shell"><div className="certificate-place-image"><Image src={interierImg} alt="Інтер’єр RESET Clinic" /></div><div><span className="editorial-kicker">RESÉT CLINIC · ЛЬВІВ</span><h2>Подарунок, за яким стоїть команда фахівців.</h2><p>Ми не просто видаємо сертифікат — допомагаємо перетворити його на корисний досвід і персонально підібраний догляд.</p><Link className="text-link" href="/contacts">Зв’язатися з нами →</Link></div></section>
      <TrustStrip />
    </div>
  );
}
