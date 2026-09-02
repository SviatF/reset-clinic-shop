import type { Metadata } from "next";
import faceImg from "@/assets/img/face.webp";
import { CategoryLanding } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Догляд за обличчям — RESET Clinic", description: "Професійна косметика для обличчя з підбором косметолога RESET Clinic.", alternates: { canonical: "/face" } };
export const dynamic = "force-dynamic";

export default function FacePage() {
  return <CategoryLanding eyebrow="ОБЛИЧЧЯ" title="Догляд, який працює разом із вашою шкірою." description="Засоби для зволоження, відновлення, роботи з текстурою та щоденного захисту. Підбираємо не за трендом, а за станом шкіри та вашою реальною рутиною." image={faceImg} imageAlt="Професійний догляд за обличчям" tone="face" />;
}
