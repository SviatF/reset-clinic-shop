import type { Metadata } from "next";
import ConsultationQuiz from "@/components/ConsultationQuiz";

export const metadata: Metadata = {
  title: "Підбір догляду — RESET Clinic",
  description: "Короткий підбір професійного догляду з можливістю консультації косметолога RESET Clinic.",
  alternates: { canonical: "/consultation" },
};

export const dynamic = "force-dynamic";

export default function ConsultationPage() {
  return (
    <section className="consultation-page">
      <div className="shell consultation-shell">
        <div className="consultation-intro">
          <div><span>RESET CARE FINDER ~ 2 ХВИЛИНИ</span><h1>Звузьте вибір до того, що вам справді потрібно.</h1></div>
          <p>Чотири короткі кроки допоможуть структурувати ваш запит. Без «магічних» обіцянок: якщо потрібна професійна оцінка, ми одразу направимо до косметолога.</p>
        </div>
        <ConsultationQuiz />
      </div>
    </section>
  );
}
