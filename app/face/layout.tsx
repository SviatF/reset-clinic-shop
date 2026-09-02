import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionSchema } from "@/lib/seo";

const description = "Професійна косметика для обличчя: зволоження, відновлення, активний догляд і SPF з можливістю підбору косметолога RESET Clinic.";

export default function FaceSeoLayout({ children }: { children: React.ReactNode }) {
  return <><JsonLd data={[
    collectionSchema({ name: "Професійний догляд за обличчям — RESET Clinic", description, path: "/face" }),
    breadcrumbSchema([{ name: "Головна", path: "/" }, { name: "Обличчя", path: "/face" }]),
  ]} />{children}</>;
}
