import { HomeFooter, HomeHeader, HomeSections } from "../components/shop/NativeHome";
import { readNativeHomeSnapshot } from "../lib/native-home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await readNativeHomeSnapshot();

  return (
    <>
      <HomeHeader nodes={snapshot.header} />
      <HomeSections
        sections={snapshot.sections}
        pageClassName={snapshot.pageClassName}
        pageElementorId={snapshot.pageElementorId}
      />
      <HomeFooter html={snapshot.footer} />
    </>
  );
}
