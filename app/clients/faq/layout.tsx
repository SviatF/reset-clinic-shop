import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo";
import { faqGroups } from "@/lib/faq-data";

const faqs=faqGroups.flatMap(group=>group.items);


const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(([question, answer]) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export default function FaqSeoLayout({ children }: { children: React.ReactNode }) {
  return <><JsonLd data={[
    faqSchema,
    breadcrumbSchema([
      { name: "Головна", path: "/" },
      { name: "Клієнту", path: "/clients/delivery" },
      { name: "FAQ", path: "/clients/faq" },
    ]),
  ]} />{children}</>;
}
