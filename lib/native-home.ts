import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import * as cheerio from "cheerio";
import { domNodeToNative, rewriteLegacyShopHost, type NativeNode } from "./native-dom";

const SOURCE_FILE = path.join(process.cwd(), "legacy-source", "index.html");

export type NativeHomeSnapshot = {
  header: NativeNode[];
  hero: NativeNode[];
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

  const sectionElements = page.children("section").toArray();
  if (!sectionElements.length) {
    throw new Error("Legacy RESET Shop homepage has no Elementor sections");
  }

  const heroNode = domNodeToNative(sectionElements[0]);
  if (!heroNode) {
    throw new Error("RESET Shop homepage hero could not be converted to native React data");
  }

  const sections = sectionElements
    .slice(1)
    .map((element) => rewriteLegacyShopHost($.html(element)));

  return {
    header: [headerNode],
    hero: [heroNode],
    sections,
    footer: rewriteLegacyShopHost($.html(footer)),
    pageClassName: page.attr("class") ?? "elementor elementor-18287",
    pageElementorId: page.attr("data-elementor-id"),
    sectionCount: sectionElements.length,
  };
});
