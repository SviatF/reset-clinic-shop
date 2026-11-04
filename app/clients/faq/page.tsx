import type { Metadata } from "next";
import Image from "next/image";
import consultationImg from "@/assets/img/consultation.webp";
import { TrustStrip } from "@/components/MarketingBlocks";
import { faqGroups as groups } from "@/lib/faq-data";

export const metadata: Metadata = { title: "FAQ — RESET Clinic", description: "Відповіді на питання про професійну косметику, доставку, безпеку та подарункові сертифікати.", alternates: { canonical: "/clients/faq" } };
export const dynamic = "force-dynamic";



export default function FAQPage() {
  return (
    <div className="inner-page faq-page">
      <section className="faq-hero shell"><div><span className="editorial-kicker">ВІДПОВІДІ ~ НА ЗАПИТАННЯ</span><h1>Менше сумнівів. Більше розуміння свого догляду.</h1><p>Зібрали питання, які найчастіше виникають до покупки, під час використання професійної косметики та після замовлення.</p></div><div><Image src={consultationImg} alt="Консультація косметолога RESET Clinic" priority /></div></section>
      <section className="faq-content shell">{groups.map((group, groupIndex) => <div className="faq-group" key={group.title}><div className="faq-group-title"><span>0{groupIndex + 1}</span><h2>{group.title}</h2></div><div className="faq-list">{group.items.map(([q,a], index) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div>)}</section>
      <TrustStrip />
    </div>
  );
}
