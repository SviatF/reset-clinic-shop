import { HomeFooter, HomeHeader, HomeSections } from "../components/shop/NativeHome";
import { NativeTree } from "../components/shop/NativeHeader";
import { readNativeHomeSnapshot } from "../lib/native-home";
import { readNativeRootShell } from "../lib/native-shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [snapshot, shell] = await Promise.all([
    readNativeHomeSnapshot(),
    readNativeRootShell(),
  ]);

  return (
    <>
      <NativeTree nodes={shell.head} keyPrefix="home-resource" />
      <HomeHeader nodes={snapshot.header} />
      <HomeSections
        hero={snapshot.hero}
        sections={snapshot.sections}
        pageClassName={snapshot.pageClassName}
        pageElementorId={snapshot.pageElementorId}
      />
      <HomeFooter nodes={snapshot.footer} />
    </>
  );
}
