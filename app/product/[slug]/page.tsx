import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageTemplate } from "../../../components/catalog/ProductPageTemplate";
import { NativeShell } from "../../../components/shop/NativePage";
import { getProductBySlug } from "../../../lib/catalog/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/product/${product.slug}/` },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return <NativeShell><ProductPageTemplate product={product} /></NativeShell>;
}
