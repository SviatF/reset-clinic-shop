import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NativeTree } from "../../../components/shop/NativeHeader";
import { readNativeArchivePage } from "../../../lib/native-archive-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? `/category/${slug}/`;
  const page = await readNativeArchivePage(pathname);

  if (!page) notFound();

  return (
    <>
      <NativeTree nodes={page.resources} keyPrefix={`category-${slug}-resource`} />
      <NativeTree nodes={page.body} keyPrefix={`category-${slug}-body`} />
    </>
  );
}
