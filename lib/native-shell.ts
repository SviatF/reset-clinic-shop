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

  // The visual layer stays intact, but the old WordPress/WooCommerce runtime
  // is deliberately not executed on native React pages.
  $("head script, head noscript").remove();

  const head = $("head").first();
  const body = $("body").first();

  if (!head.length || !body.length) {
    throw new Error("Legacy RESET Shop shell could not be resolved");
  }

  return {
    head: domChildrenToNative(head.contents().toArray()),
    bodyClassName: body.attr("class"),
    bodyId: body.attr("id"),
  };
});
