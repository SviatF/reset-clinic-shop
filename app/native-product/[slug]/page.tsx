import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NativeTree } from "../../../components/shop/NativeHeader";
import { readNativeArchivePage } from "../../../lib/native-archive-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NativeProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NativeProductPage({ params }: NativeProductPageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? `/${slug}/`;
  const page = await readNativeArchivePage(pathname);

  if (!page || !page.bodyClassName?.split(/\s+/).includes("single-product")) {
    notFound();
  }

  return (
    <>
      <NativeTree nodes={page.resources} keyPrefix={`product-${slug}-resource`} />
      <NativeTree nodes={page.body} keyPrefix={`product-${slug}-body`} />
    </>
  );
}
