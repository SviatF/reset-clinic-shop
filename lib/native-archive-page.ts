import { promises as fs } from "node:fs";
import { cache } from "react";
import * as cheerio from "cheerio";
import { domChildrenToNative, type NativeNode } from "./native-dom";
import { findLegacyDocument } from "./legacy-source";

export type NativeArchivePage = {
  resources: NativeNode[];
  body: NativeNode[];
  bodyClassName?: string;
  bodyId?: string;
};

function pathnameSegments(pathname: string) {
  const cleanPath = pathname.split("?", 1)[0]?.split("#", 1)[0] ?? "/";
  return cleanPath.split("/").filter(Boolean);
}

/**
 * Converts one archived RESET Shop document into React-renderable data.
 *
 * The saved WordPress/Elementor pages contain a large amount of visual CSS as
 * top-level body nodes. We preserve those resources, while executable legacy
 * WordPress/WooCommerce scripts are deliberately removed from the native page.
 */
export const readNativeArchivePage = cache(
  async (pathname: string): Promise<NativeArchivePage | null> => {
    const document = await findLegacyDocument(pathnameSegments(pathname));
    if (!document) return null;

    const source = await fs.readFile(document, "utf8");
    const $ = cheerio.load(source);

    $("script").each((_, element) => {
      const type = ($(element).attr("type") ?? "").toLowerCase();
      if (type !== "application/ld+json") $(element).remove();
    });
    $("noscript").remove();

    const head = $("head").first();
    const body = $("body").first();

    if (!head.length || !body.length) {
      throw new Error(`Archived RESET Shop document has no usable shell: ${pathname}`);
    }

    const misplacedResources = body
      .children("meta, title, link, style, script[type='application/ld+json']")
      .toArray();

    const resources = domChildrenToNative([
      ...head.contents().toArray(),
      ...misplacedResources,
    ]);

    // They are rendered once by the native page and must not also remain in the
    // converted body tree.
    body
      .children("meta, title, link, style, script[type='application/ld+json']")
      .remove();

    return {
      resources,
      body: domChildrenToNative(body.contents().toArray()),
      bodyClassName: body.attr("class"),
      bodyId: body.attr("id"),
    };
  },
);
