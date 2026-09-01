import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import * as cheerio from "cheerio";
import { domChildrenToNative, type NativeNode } from "./native-dom";

const SOURCE_FILE = path.join(process.cwd(), "legacy-source", "index.html");

export type NativeRootShell = {
  head: NativeNode[];
  bodyClassName?: string;
  bodyId?: string;
};

export const readNativeRootShell = cache(async (): Promise<NativeRootShell> => {
  const source = await fs.readFile(SOURCE_FILE, "utf8");
  const $ = cheerio.load(source);

  // Saved storefront HTML contains a large part of its visual resources as
  // top-level body nodes rather than inside <head>. The browser accepted that
  // in the archived document, so native React must explicitly hoist those
  // stylesheet/style/meta/title nodes into the real Next.js <head>.
  $("script").each((_, element) => {
    const type = ($(element).attr("type") ?? "").toLowerCase();
    if (type !== "application/ld+json") $(element).remove();
  });
  $("noscript").remove();

  const head = $("head").first();
  const body = $("body").first();

  if (!head.length || !body.length) {
    throw new Error("Legacy RESET Shop shell could not be resolved");
  }

  const headNodes = head.contents().toArray();
  const misplacedBodyHeadNodes = body
    .children("meta, title, link, style, script[type='application/ld+json']")
    .toArray();

  return {
    head: domChildrenToNative([...headNodes, ...misplacedBodyHeadNodes]),
    bodyClassName: body.attr("class"),
    bodyId: body.attr("id"),
  };
});
