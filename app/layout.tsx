import type { ReactNode } from "react";
import { readLegacyRootDocumentParts } from "../lib/legacy-source";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const legacy = await readLegacyRootDocumentParts();

  return (
    <html lang="uk">
      <head dangerouslySetInnerHTML={{ __html: legacy.headHtml }} />
      <body id={legacy.bodyId} className={legacy.bodyClassName}>
        {children}
      </body>
    </html>
  );
}
