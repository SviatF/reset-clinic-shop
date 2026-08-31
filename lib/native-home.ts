import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import * as cheerio from "cheerio";
import { domNodeToNative, rewriteLegacyShopHost, type NativeNode } from "./native-dom";

const SOURCE_FILE = path.join(process.cwd(), "legacy-source", "index.html");

export type NativeHomeSnapshot = {
  header: NativeNode[];
  sections: string[];
  footer: string;
  pageClassName: string;
  pageElementorId?: string;
  sectionCount: number;
};

export const readNativeHomeSnapshot = cache(async (): Promise<NativeHomeSnapshot> => {
  const source = await fs.readFile(SOURCE_FILE, "utf8");
  const $ = cheerio.load(source);

  // Old WordPress/WooCommerce scripts are not part of the new runtime. Keeping
  // them in SSR output would re-introduce the legacy application layer.
  $("script, noscript").remove();

  const header = $(".elementor-location-header").first();
  const page = $(".elementor-18287").first();
  const footer = $("#main-footer").first().length
    ? $("#main-footer").first()
    : $("footer").first();

  if (!header.length || !page.length || !footer.length) {
    throw new Error("Legacy RESET Shop homepage landmarks could not be resolved");
  }

  const headerNode = domNodeToNative(header.get(0));
  if (!headerNode) {
    throw new Error("RESET Shop header could not be converted to native React data");
  }

  const sections = page
    .children("section")
    .map((_, element) => rewriteLegacyShopHost($.html(element)))
    .get();

  if (!sections.length) {
    throw new Error("Legacy RESET Shop homepage has no Elementor sections");
  }

  return {
    header: [headerNode],
    sections,
    footer: rewriteLegacyShopHost($.html(footer)),
    pageClassName: page.attr("class") ?? "elementor elementor-18287",
    pageElementorId: page.attr("data-elementor-id"),
    sectionCount: sections.length,
  };
});
