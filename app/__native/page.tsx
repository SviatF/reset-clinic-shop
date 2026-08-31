import type { Metadata } from "next";
import { LegacyReactFragment } from "../../components/shop/LegacyReactFragment";
import { readNativeHomeSnapshot } from "../../lib/native-home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await readNativeHomeSnapshot();
  return {
    title: `${snapshot.title} — native migration preview`,
    robots: { index: false, follow: false },
  };
}

export default async function NativeHomeMigrationPage() {
  const snapshot = await readNativeHomeSnapshot();
  const bodyClassScript = `document.body.className=${JSON.stringify(snapshot.bodyClasses)};document.documentElement.classList.add('reset-native-migration');`;

  return (
    <>
      <LegacyReactFragment html={snapshot.headStyles} />
      <script dangerouslySetInnerHTML={{ __html: bodyClassScript }} />
      <LegacyReactFragment html={snapshot.header} />
      <div className="elementor elementor-18287" data-elementor-id="18287" data-elementor-type="wp-page">
        {snapshot.sections.map((section, index) => (
          <LegacyReactFragment key={index} html={section} />
        ))}
      </div>
      <LegacyReactFragment html={snapshot.footer} />
    </>
  );
}
