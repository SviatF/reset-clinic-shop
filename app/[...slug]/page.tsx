import { notFound } from "next/navigation";
import { NativeTree } from "../../components/shop/NativeHeader";
import { readNativeLegacyPage } from "../../lib/native-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NativeStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const page = await readNativeLegacyPage(slug);

  if (!page) notFound();

  return <NativeTree nodes={page.nodes} keyPrefix={`route.${slug.join(".")}`} />;
}
