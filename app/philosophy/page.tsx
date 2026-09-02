import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import teamImg from "@/assets/img/reset-team-doctors.webp";
import consultationImg from "@/assets/img/consultation.webp";
import interierImg from "@/assets/img/interier.webp";
import buyInHandImg from "@/assets/img/buyinhand.webp";
import { Arrow, TrustStrip } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Філософія RESET Clinic", description: "Філософія RESET Clinic: професійна діагностика, доказова косметика та персональний супровід.", alternates: { canonical: "/philosophy" } };
export const dynamic = "force-dynamic";

export default function PhilosophyPage() {
  return (
    <div className="inner-page philosophy-page">
      <section className="editorial-hero shell">
        <div className="editorial-hero-copy"><span className="editorial-kicker">ФІЛОСОФІЯ ~ RESET</span><h1>Ваша шкіра — це не просто косметика. Це наш пріоритет.</h1><p>У світі, де полиці переповнені тисячами баночок, ми обрали шлях професійної діагностики та доказової косметики.</p><Link className="black-button" href="/contacts">Почати з консультації <Arrow /></Link></div>
        <div className="editorial-hero-image"><Image src={teamImg} alt="Команда лікарів RESET Clinic" priority /><span className="image-caption">Лікарі RESET Clinic · Львів</span></div>
      </section>

      <section className="statement-section shell"><span>01 / КРАСА ЧЕРЕЗ ЗДОРОВ’Я</span><h2>Ми не шукаємо «магічний» крем.<br/>Ми будуємо систему, яка працює щодня.</h2><p>Сьогодні RESÉT — це простір, де кожен засіб на вашій поличці підібраний фахівцем, який розуміє структуру вашої шкіри, активні компоненти та їхню сумісність.</p></section>

      <section className="story-grid shell">
        <div className="story-image tall"><Image src={consultationImg} alt="Консультація у RESET Clinic" /></div>
        <div className="story-copy"><span className="editorial-kicker">ВІД КОНСУЛЬТАЦІЇ</span><h2>До сяяння.</h2><p>Наш шлях починається з розуміння ваших потреб. Ми аналізуємо стан шкіри, спосіб життя та цілі, щоб підібрати лише ті засоби, які дадуть реальний результат.</p><p>Ми відмовилися від мас-маркету на користь професійних брендів, ефективність яких підтверджена дослідженнями та нашою практикою.</p></div>
      </section>

      <section className="mosaic-proof shell">
        <div className="mosaic-copy"><span>НАШ ПІДХІД</span><h2>Не продати більше.<br/>Підібрати точніше.</h2><p>Кожен продукт має свою роль у схемі. Ми пояснюємо, що використовувати вранці, що ввечері, як вводити активи та коли очікувати результат.</p><Link className="text-link" href="/advantages">Дізнатися про наші переваги →</Link></div>
        <div className="mosaic-main"><Image src={buyInHandImg} alt="Передача підібраної косметики клієнту" /></div>
        <div className="mosaic-small"><Image src={interierImg} alt="Інтер’єр RESET Clinic" /></div>
      </section>
      <TrustStrip />
    </div>
  );
}
