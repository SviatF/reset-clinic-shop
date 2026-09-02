import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import interierImg from "@/assets/img/interier.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Доставка та оплата — RESET Clinic", description: "Нова Пошта, кур’єрська доставка, самовивіз із RESET Clinic та онлайн-оплата.", alternates: { canonical: "/clients/delivery" } };
export const dynamic = "force-dynamic";

export default function DeliveryPage() {
  return (
    <div className="inner-page policy-page">
      <section className="policy-hero shell">
        <div className="policy-hero-copy"><span className="editorial-kicker">ДОСТАВКА ВАШОГО ~ ДОГЛЯДУ</span><h1>Від нашої полиці — до вашої рутини.</h1><p>Ми пакуємо професійну косметику так само уважно, як підбираємо її: перевіряємо, захищаємо та передаємо у доставку без зайвих затримок.</p><a className="black-button" href="#delivery-options">Обрати спосіб <Arrow /></a></div>
        <div className="policy-hero-image"><Image src={buyInHandImg} alt="Передача замовлення RESET Clinic клієнту" priority /></div>
      </section>

      <section className="policy-options shell" id="delivery-options">
        <div className="section-heading"><span>СПОСОБИ ДОСТАВКИ</span><h2>Як вам зручно.</h2></div>
        <div className="option-grid"><article><b>01</b><h3>Нова Пошта</h3><p>На відділення або поштомат. Термін доставки — орієнтовно 1–3 робочі дні.</p></article><article><b>02</b><h3>Доставка по місту</h3><p>Кур’єром Нової Пошти за вказаною адресою або службою таксі.</p></article><article><b>03</b><h3>Самовивіз із клініки</h3><p>Львів, вул. Кульпарківська, 93/2. Ми підготуємо замовлення до вашого приходу.</p></article></div>
      </section>

      <section className="delivery-details shell">
        <div><span className="editorial-kicker">ВАРТІСТЬ</span><h2>Від 5000 грн — доставка за наш рахунок.</h2><p>Інші замовлення доставляються за актуальними тарифами перевізника «Нова Пошта».</p></div>
        <div><span className="editorial-kicker">ОПЛАТА</span><h2>Безпечно онлайн або у клініці.</h2><p>Онлайн-оплата через WayForPay картками Visa / Mastercard, а також готівкою чи карткою через термінал при самовивозі.</p></div>
      </section>

      <section className="pickup-banner shell"><div><Image src={interierImg} alt="RESET Clinic у Львові" /></div><div><span>САМОВИВІЗ</span><h2>Заберіть замовлення там, де його можуть одразу пояснити.</h2><p>Якщо потрібно — під час візиту уточніть схему використання або сумісність засобу з вашим поточним доглядом.</p><Link className="text-link" href="/contacts">Контакти клініки →</Link></div></section>
      <TrustStrip />
    </div>
  );
}
