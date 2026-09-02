import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionSchema } from "@/lib/seo";

const description = "Професійний догляд за волоссям і шкірою голови: очищення, відновлення, захист довжини та підбір засобів RESET Clinic.";

export default function HairSeoLayout({ children }: { children: React.ReactNode }) {
  return <><JsonLd data={[
    collectionSchema({ name: "Професійний догляд за волоссям — RESET Clinic", description, path: "/hair" }),
    breadcrumbSchema([{ name: "Головна", path: "/" }, { name: "Волосся", path: "/hair" }]),
  ]} />{children}</>;
}
