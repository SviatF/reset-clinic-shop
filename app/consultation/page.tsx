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
    <section className="consultation-page consultation-quiz-page">
      <div className="shell consultation-shell consultation-quiz-shell">
        <ConsultationQuiz />
      </div>
    </section>
  );
}
