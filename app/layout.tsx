import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  findLegacyDocument,
  readLegacyDocumentParts,
  readLegacyRootDocumentParts,
} from "../lib/legacy-source";

async function legacyDocumentForRequest() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-reset-path") ?? "/";
  const segments = pathname.split("/").filter(Boolean);

  if (!segments.length) {
    return readLegacyRootDocumentParts();
  }

  const document = await findLegacyDocument(segments);
  if (!document) {
    return readLegacyRootDocumentParts();
  }

  return readLegacyDocumentParts(document);
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const legacy = await legacyDocumentForRequest();

  return (
    <html lang="uk">
      <head dangerouslySetInnerHTML={{ __html: legacy.headHtml }} />
      <body id={legacy.bodyId} className={legacy.bodyClassName}>
        {children}
      </body>
    </html>
  );
}
