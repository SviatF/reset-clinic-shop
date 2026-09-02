import type { Metadata } from "next";
import { NativeSnapshotPage } from "../../components/shop/NativePage";
import { getNativePageMeta, normalizeNativePathname } from "../../lib/native-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NativeCatchAllProps = {
  params: Promise<{ slug?: string[] }>;
};

function pathnameFromSlug(slug?: string[]) {
  return normalizeNativePathname(`/${slug?.join("/") ?? ""}/`);
}

export async function generateMetadata({ params }: NativeCatchAllProps): Promise<Metadata> {
  const { slug } = await params;
  const pathname = pathnameFromSlug(slug);
  const page = getNativePageMeta(pathname);
  return page
    ? { title: page.title, alternates: { canonical: pathname } }
    : { robots: { index: false, follow: false } };
}

export default async function NativeCatchAllPage({ params }: NativeCatchAllProps) {
  const { slug } = await params;
  return <NativeSnapshotPage pathname={pathnameFromSlug(slug)} />;
}
