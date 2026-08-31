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

function cleanBodyClasses(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .filter((name) => name !== "has-mouse-dot" && name !== "has-mouse-circle")
    .join(" ");
}

export type NativeHomeSnapshot = {
  title: string;
  bodyClasses: string;
  headStyles: string;
  header: string;
  sections: string[];
  footer: string;
};

export const readNativeHomeSnapshot = cache(async (): Promise<NativeHomeSnapshot> => {
  const source = await fs.readFile(SOURCE_FILE, "utf8");
  const $ = cheerio.load(source);

  // WordPress/WooCommerce runtime scripts are intentionally not carried into the
  // native Next.js page. During the visual migration, only inert DOM + CSS are used.
  $("script, noscript").remove();

  const header = $(".elementor-location-header").first();
  const page = $(".elementor-18287").first();
  const footer = $("#main-footer").first().length
    ? $("#main-footer").first()
    : $("footer").first();

  if (!header.length || !page.length || !footer.length) {
    throw new Error("Legacy RESET Shop homepage landmarks could not be resolved");
  }

  const styles = $("style")
    .map((_, element) => $.html(element))
    .get()
    .join("\n");

  const stylesheetLinks = $("link[rel='stylesheet']")
    .map((_, element) => $.html(element))
    .get()
    .join("\n");

  const sections = page
    .children("section")
    .map((_, element) => rewriteShopHost($.html(element)))
    .get();

  return {
    title: $("title").first().text().trim() || "RESET Clinic Shop",
    bodyClasses: cleanBodyClasses($("body").attr("class") ?? ""),
    headStyles: rewriteShopHost(`${stylesheetLinks}\n${styles}`),
    header: rewriteShopHost($.html(header)),
    sections,
    footer: rewriteShopHost($.html(footer)),
  };
});
