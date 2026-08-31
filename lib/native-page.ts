import * as cheerio from "cheerio";
import { domChildrenToNative, type NativeNode } from "./native-dom";
import { findLegacyDocument, readLegacyDocumentParts } from "./legacy-source";

export type NativeLegacyPage = {
  nodes: NativeNode[];
  bodyClassName?: string;
  bodyId?: string;
};

export async function readNativeLegacyPage(segments: string[]): Promise<NativeLegacyPage | null> {
  const document = await findLegacyDocument(segments);
  if (!document) return null;

  const parts = await readLegacyDocumentParts(document);
  const $ = cheerio.load(parts.bodyHtml, null, false);

  // The visual DOM is rendered by React. Archived WordPress/WooCommerce scripts
  // are intentionally excluded from the new runtime and will be replaced by
  // focused React behavior as each storefront feature is migrated.
  $("script, noscript").remove();

  return {
    nodes: domChildrenToNative($.root().contents().toArray()),
    bodyClassName: parts.bodyClassName,
    bodyId: parts.bodyId,
  };
}
