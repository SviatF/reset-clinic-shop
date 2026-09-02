import type { Metadata } from "next";
import Image from "next/image";
import certMain from "@/assets/img/certificak-main2.webp";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import { TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Повернення та контроль якості — RESET Clinic", description: "Політика якості, правила повернення та дії у випадку пошкодження товару RESET Clinic.", alternates: { canonical: "/clients/returns" } };
export const dynamic = "force-dynamic";

export default function ReturnsPage() {
  return (
    <div className="inner-page returns-page">
      <section className="returns-hero shell">
        <div><span className="editorial-kicker">ПОЛІТИКА ЯКОСТІ ~</span><h1>Безпека продукту важливіша за формальне «повернення».</h1><p>Косметика належної якості не підлягає обміну або поверненню. Це правило захищає вас: кожен продукт, який ви отримуєте, має бути новим, не відкритим і не використаним сторонніми особами.</p></div>
        <div className="returns-visual returns-cert-square"><Image src={certMain} alt="Подарунковий сертифікат RESET Clinic" priority /></div>
      </section>

      <section className="quality-check shell"><div className="quality-image"><Image src={buyInHandImg} alt="Перевірене замовлення RESET Clinic" /></div><div className="quality-copy"><span>ПЕРЕД ВІДПРАВКОЮ</span><h2>Ми перевіряємо кожен флакон.</h2><ul><li>термін придатності;</li><li>цілісність флакона й коробки;</li><li>герметичність кришки;</li><li>надійність пакування для транспортування.</li></ul></div></section>

      <section className="problem-process shell">
        <div className="section-heading"><span>ЯКЩО ВИНИКЛА ПРОБЛЕМА</span><h2>Три кроки, щоб вирішити її швидко.</h2></div>
        <div className="process-grid"><article><b>01</b><h3>Огляньте на пошті</h3><p>Якщо є пошкодження флакона або коробки — складіть Акт огляду разом із працівником Нової Пошти.</p></article><article><b>02</b><h3>Зробіть фото</h3><p>Надішліть нам фото пошкодження у месенджер або на email протягом 24 годин після отримання.</p></article><article><b>03</b><h3>Отримайте рішення</h3><p>На підставі акта та фото ми проведемо заміну товару на аналогічний або повернемо кошти на картковий рахунок.</p></article></div>
        <div className="important-note"><b>Важливо.</b><p>Претензії щодо пошкоджень, виявлені після виходу з відділення служби доставки без оформленого акта, не можуть бути коректно підтверджені перевізником.</p></div>
      </section>
      <TrustStrip />
    </div>
  );
}
