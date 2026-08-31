import { readLegacyRootDocumentParts } from "../lib/legacy-source";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const legacy = await readLegacyRootDocumentParts();

  return <div dangerouslySetInnerHTML={{ __html: legacy.bodyHtml }} />;
}
