import Link from "next/link";
import type { Metadata } from "next";

export const metadata:Metadata={
 title:"Замовлення оформлено — RESET Clinic",
 robots:{index:false,follow:false}
};
export default async function CashOrderConfirmation({
 searchParams
}:{
 searchParams:Promise<{number?:string}>
}){
 const query=await searchParams;
 const number=typeof query.number==="string"&&/^RST-[A-F0-9]{8}$/.test(query.number)?query.number:null;
 return <section className="payment-result-page payment-result-success">
  <div className="shell payment-result-shell">
   <div className="payment-result-mark" aria-hidden="true"><span>✓</span></div>
   <span className="payment-result-eyebrow">ЗАМОВЛЕННЯ ПРИЙНЯТО</span>
   <h1>Дякуємо за замовлення.</h1>
   <p>Ми отримали замовлення. Оплата — <strong>готівкою при самовивозі</strong> в RESET Clinic. Онлайн-списання коштів не відбувалося.</p>
   <div className="payment-result-meta">
    {number&&<div><span>НОМЕР ЗАМОВЛЕННЯ</span><strong>{number}</strong></div>}
    <div><span>ОПЛАТА</span><strong>При отриманні</strong></div>
    <div><span>САМОВИВІЗ</span><strong>Львів, Кульпарківська, 93/2</strong></div>
   </div>
   <p>Менеджер уточнить готовність замовлення. Дочекайтеся підтвердження перед візитом.</p>
   <div className="payment-result-actions">
    <Link className="payment-result-primary" href="/">ПОВЕРНУТИСЯ ДО МАГАЗИНУ →</Link>
   </div>
  </div>
 </section>;
}
