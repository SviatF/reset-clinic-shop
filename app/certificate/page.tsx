import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import certMain from "@/assets/img/certificak-main.webp";
import certSecond from "@/assets/img/certificat-second.webp";
import interierImg from "@/assets/img/interier.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Подарунковий сертифікат — RESET Clinic", description: "Подарунковий сертифікат RESET Clinic на професійну косметику та послуги клініки.", alternates: { canonical: "/certificate" } };
export const dynamic = "force-dynamic";

export default function CertificatePage() {
  return (
    <div className="inner-page certificate-page">
      <section className="certificate-hero shell">
        <div className="certificate-copy"><span className="editorial-kicker">ПОДАРУНОК ~ БЕЗ РИЗИКУ НЕ ВГАДАТИ</span><h1>Даруйте не баночку. Даруйте правильний вибір.</h1><p>Сертифікат RESET Clinic можна використати на професійну косметику або послуги клініки. Людина сама обирає, що їй потрібно, а ми допомагаємо зробити це професійно.</p><Link className="black-button" href="/contacts">Замовити сертифікат <Arrow /></Link><small>Термін дії — 3 місяці з моменту придбання.</small></div>
        <div className="certificate-art"><Image src={certMain} alt="Подарунковий сертифікат RESET Clinic" priority /><Image src={certSecond} alt="Подарунковий сертифікат RESET Clinic — варіант" /></div>
      </section>
      <section className="certificate-steps shell"><div><span>01</span><h3>Оберіть номінал</h3><p>Підберемо формат під ваш бюджет та привід.</p></div><div><span>02</span><h3>Отримайте сертифікат</h3><p>Підготуємо його до вручення або самовивозу з клініки.</p></div><div><span>03</span><h3>Ми допоможемо з вибором</h3><p>Отримувач може використати сертифікат на послугу або професійну косметику.</p></div></section>
      <section className="certificate-place shell"><div className="certificate-place-image"><Image src={interierImg} alt="Інтер’єр RESET Clinic" /></div><div><span className="editorial-kicker">RESÉT CLINIC · ЛЬВІВ</span><h2>Подарунок, за яким стоїть команда фахівців.</h2><p>Ми не просто видаємо сертифікат — допомагаємо перетворити його на корисний досвід і персонально підібраний догляд.</p><Link className="text-link" href="/contacts">Зв’язатися з нами →</Link></div></section>
      <TrustStrip />
    </div>
  );
}
