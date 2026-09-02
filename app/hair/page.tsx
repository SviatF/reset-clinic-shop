import type { Metadata } from "next";
import hairImg from "@/assets/img/hair.webp";
import { CategoryLanding } from "@/components/MarketingBlocks";

export const metadata: Metadata = { title: "Догляд за волоссям — RESET Clinic", description: "Професійний догляд за волоссям і шкірою голови від RESET Clinic.", alternates: { canonical: "/hair" } };
export const dynamic = "force-dynamic";

export default function HairPage() {
  return <CategoryLanding eyebrow="ВОЛОССЯ" title="Здорове волосся починається зі зрозумілої системи." description="Догляд за довжиною та шкірою голови без перевантаження. Допомагаємо підібрати засоби під стан волосся, частоту миття та ваш звичний стайлінг." image={hairImg} imageAlt="Професійний догляд за волоссям" tone="hair" />;
}
