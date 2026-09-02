import type { Metadata } from "next";
import bodyImg from "@/assets/img/body.webp";
import { CategoryLanding } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Догляд за тілом — RESET Clinic", description: "Професійна косметика для тіла з підбором фахівця RESET Clinic.", alternates: { canonical: "/body" } };
export const dynamic = "force-dynamic";

export default function BodyPage() {
  return <CategoryLanding eyebrow="ТІЛО" title="Догляд за тілом без випадкових баночок." description="Текстура, зволоження, комфорт і активний догляд — підбираємо формули під ваші задачі та сезонність, щоб рутина була простою і результативною." image={bodyImg} imageAlt="Професійний догляд за тілом" tone="body" />;
}
