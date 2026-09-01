import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeFooter, HomeHeader } from "../../../components/shop/NativeHome";
import { NativeTree } from "../../../components/shop/NativeHeader";
import { ProductPageTemplate } from "../../../components/catalog/ProductPageTemplate";
import { getProductBySlug } from "../../../lib/catalog/provider";
import { readNativeHomeSnapshot } from "../../../lib/native-home";
import { readNativeRootShell } from "../../../lib/native-shell";

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
  const [product, snapshot, shell] = await Promise.all([
    getProductBySlug(slug),
    readNativeHomeSnapshot(),
    readNativeRootShell(),
  ]);

  if (!product) notFound();

  return (
    <>
      <NativeTree nodes={shell.head} keyPrefix="product-resource" />
      <HomeHeader nodes={snapshot.header} />
      <ProductPageTemplate product={product} />
      <HomeFooter nodes={snapshot.footer} />
    </>
  );
}

