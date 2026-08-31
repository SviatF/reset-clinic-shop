import type { Metadata } from "next";
import { HomeFooter, HomeHeader, HomeSections } from "../../components/shop/NativeHome";
import { readNativeHomeSnapshot } from "../../lib/native-home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RESET Clinic Shop — native Next.js migration preview",
  robots: { index: false, follow: false },
};

export default async function NativeHomePreviewPage() {
  const snapshot = await readNativeHomeSnapshot();

  return (
    <>
      <HomeHeader nodes={snapshot.header} />
      <HomeSections
        hero={snapshot.hero}
        sections={snapshot.sections}
        pageClassName={snapshot.pageClassName}
        pageElementorId={snapshot.pageElementorId}
      />
      <HomeFooter html={snapshot.footer} />
    </>
  );
}
