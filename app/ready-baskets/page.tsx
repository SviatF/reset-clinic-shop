import type { Metadata } from "next";
import Link from "next/link";
import { readProducts } from "@/lib/commerce-json";
import { readPublishedReadyBaskets, readyBasketResolved } from "@/lib/ready-baskets";
import ReadyBasketVisual from "@/components/ReadyBasketVisual";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 title: "Готові кошики — професійні добірки догляду",
 description: "Добірки засобів RESET Clinic для послідовного домашнього догляду. Актуальна вартість залежить від товарів у наборі.",
 alternates: {canonical:"/ready-baskets"},
};
const money=(n:number)=>new Intl.NumberFormat("uk-UA",{style:"currency",currency:"UAH",maximumFractionDigits:2}).format(n);

export default async function ReadyBasketsPage(){
 const [baskets,products]=await Promise.all([readPublishedReadyBaskets(),readProducts()]);
 const visible=baskets.map(basket=>readyBasketResolved(basket,products));
 return <div className="rb-shop-page">
  <section className="rb-hero shell">
   <div className="rb-hero-eyebrow"><span>RESET CLINIC</span><span>КОЛЕКЦІЯ ДОГЛЯДУ / 01—{String(visible.length).padStart(2,"0")}</span></div>
   <div className="rb-hero-grid"><h1>Готові<br/><em>кошики.</em></h1><div><span>CURATED SKINCARE</span><p>Продумані комбінації професійних засобів. Ми зібрали догляд у зрозумілі кроки — вам залишається обрати свою потребу.</p><Link href="/consultation">Не знаєте, що обрати? Підбір косметолога <span aria-hidden="true">↗</span></Link></div></div>
  </section>
  <section className="rb-shop-list shell" aria-label="Добірки догляду">
   <div className="rb-list-heading"><span>ДОБІРКИ RESET</span><span>{visible.length} {visible.length===1?"набір":visible.length>=2&&visible.length<=4?"набори":"наборів"}</span></div>
   {visible.length===0?<div className="rb-shop-empty"><h2>Добірки готуються</h2><p>Незабаром тут з’являться готові програми догляду. Поки можна обрати косметику в каталозі.</p><Link href="/catalog">ПЕРЕЙТИ ДО КАТАЛОГУ ↗</Link></div>:
    <div className="rb-list-grid">{visible.map((basket,i)=><Link className="rb-shop-card" key={basket.id} href={`/ready-baskets/${basket.slug}`}>
      <div className="rb-card-image"><ReadyBasketVisual basket={basket} products={basket.products.map(x=>x.product)}/><span className="rb-card-number">{String(i+1).padStart(2,"0")} / RESET</span></div>
      <div className="rb-card-content"><span className="rb-card-label">ПРОФЕСІЙНА ДОБІРКА · {basket.count} ЗАСОБІВ</span>
       <h2>{basket.title}</h2>
       {basket.concern&&<p>{basket.concern}</p>}
       <div className="rb-card-bottom"><div><small>ВАРТІСТЬ УСЬОГО НАБОРУ</small><strong>{money(basket.total)}</strong></div><span className="rb-circle-link" aria-hidden="true">↗</span></div>
      </div>
    </Link>)}</div>}
   <p className="rb-pricing-note">Вартість розраховується з актуальних цін засобів і може змінюватися до оформлення замовлення. Добірки не замінюють індивідуальну консультацію.</p>
  </section>
  <section className="rb-expert shell"><div><span>RESET CLINIC / EXPERT ADVICE</span><h2>Правильний догляд починається<br/>з розуміння потреб шкіри.</h2></div><Link href="/consultation">ПІДІБРАТИ ДОГЛЯД <span>↗</span></Link></section>
 </div>;
}
