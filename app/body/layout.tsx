import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionSchema } from "@/lib/seo";

const description = "Професійний догляд за тілом: зволоження, відновлення бар’єру, комфорт і спеціалізовані засоби з підбором RESET Clinic.";

export default function BodySeoLayout({ children }: { children: React.ReactNode }) {
  return <><JsonLd data={[
    collectionSchema({ name: "Професійний догляд за тілом — RESET Clinic", description, path: "/body" }),
    breadcrumbSchema([{ name: "Головна", path: "/" }, { name: "Тіло", path: "/body" }]),
  ]} />{children}</>;
}
