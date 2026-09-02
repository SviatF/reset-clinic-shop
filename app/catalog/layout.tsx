import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionSchema } from "@/lib/seo";

const description = "Каталог професійної косметики RESET Clinic: засоби для обличчя, тіла та волосся з професійним підбором і доставкою по Україні.";

export const metadata: Metadata = {
  title: "Каталог професійної косметики",
  description,
  alternates: { canonical: "/catalog" },
  openGraph: { title: "Каталог професійної косметики — RESET Clinic", description, url: "/catalog" },
};

export default function CatalogSeoLayout({ children }: { children: React.ReactNode }) {
  return <><JsonLd data={[
    collectionSchema({ name: "Каталог професійної косметики RESET Clinic", description, path: "/catalog" }),
    breadcrumbSchema([{ name: "Головна", path: "/" }, { name: "Каталог", path: "/catalog" }]),
  ]} />{children}</>;
}
