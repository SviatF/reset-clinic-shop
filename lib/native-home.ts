import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import * as cheerio from "cheerio";
import { domNodeToNative, type NativeNode } from "./native-dom";

const SOURCE_FILE = path.join(process.cwd(), "legacy-source", "index.html");

export type NativeHomeSnapshot = {
  header: NativeNode[];
  hero: NativeNode[];
  sections: NativeNode[];
  footer: NativeNode[];
  pageClassName: string;
  pageElementorId?: string;
  sectionCount: number;
};

function requireNativeNode(node: any, label: string): NativeNode {
  const converted = domNodeToNative(node);
  if (!converted) throw new Error(`${label} could not be converted to native React data`);
  return converted;
}

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

  const sectionElements = page.children("section").toArray();
  if (!sectionElements.length) {
    throw new Error("Legacy RESET Shop homepage has no Elementor sections");
  }

  const headerNode = requireNativeNode(header.get(0), "RESET Shop header");
  const heroNode = requireNativeNode(sectionElements[0], "RESET Shop homepage hero");
  const sectionNodes = sectionElements
    .slice(1)
    .map((element, index) => requireNativeNode(element, `RESET Shop homepage section ${index + 2}`));
  const footerNode = requireNativeNode(footer.get(0), "RESET Shop footer");

  return {
    header: [headerNode],
    hero: [heroNode],
    sections: sectionNodes,
    footer: [footerNode],
    pageClassName: page.attr("class") ?? "elementor elementor-18287",
    pageElementorId: page.attr("data-elementor-id"),
    sectionCount: sectionElements.length,
  };
});
