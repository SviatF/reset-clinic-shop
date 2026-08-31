import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import * as cheerio from "cheerio";

const SOURCE_FILE = path.join(process.cwd(), "legacy-source", "index.html");

function rewriteShopHost(value: string) {
  return value
    .replace(/https?:\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "")
    .replace(/\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "");
}

export type NativeHomeSnapshot = {
  header: string;
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
  // them in SSR HTML would re-introduce the legacy application layer and can
  // execute against DOM that is being migrated to React.
  $("script, noscript").remove();

  const header = $(".elementor-location-header").first();
  const page = $(".elementor-18287").first();
  const footer = $("#main-footer").first().length
    ? $("#main-footer").first()
    : $("footer").first();

  if (!header.length || !page.length || !footer.length) {
    throw new Error("Legacy RESET Shop homepage landmarks could not be resolved");
  }

  const sections = page
    .children("section")
    .map((_, element) => rewriteShopHost($.html(element)))
    .get();

  if (!sections.length) {
    throw new Error("Legacy RESET Shop homepage has no Elementor sections");
  }

  return {
    header: rewriteShopHost($.html(header)),
    sections,
    footer: rewriteShopHost($.html(footer)),
    pageClassName: page.attr("class") ?? "elementor elementor-18287",
    pageElementorId: page.attr("data-elementor-id"),
    sectionCount: sections.length,
  };
});
