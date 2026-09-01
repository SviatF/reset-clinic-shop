import { closeSync, openSync, readSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const LEGACY_SOURCE_DIR = join(process.cwd(), "legacy-source");
const BODY_TAG_PATTERN = /<body\b[^>]*>/i;
const BODY_CLASS_PATTERN = /\bclass=(["'])(.*?)\1/i;
const SINGLE_PRODUCT_CLASS_PATTERN = /\bclass=(["'])[^"']*\bsingle-product\b[^"']*\1/i;

function readArchivedBodyTag(filePath: string) {
  const descriptor = openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  let tail = "";

  try {
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, position);
      if (bytesRead === 0) return null;

      position += bytesRead;
      const chunk = tail + buffer.toString("utf8", 0, bytesRead);
      const bodyTag = chunk.match(BODY_TAG_PATTERN)?.[0];
      if (bodyTag) return bodyTag;

      tail = chunk.slice(-4096);
    }
  } finally {
    closeSync(descriptor);
  }
}

function discoverNativeProductSlugs() {
  const slugs: string[] = [];

  for (const entry of readdirSync(LEGACY_SOURCE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const indexPath = join(LEGACY_SOURCE_DIR, entry.name, "index.html");

    try {
      const bodyTag = readArchivedBodyTag(indexPath);
      const bodyClass = bodyTag?.match(BODY_CLASS_PATTERN)?.[2] ?? "(no body class)";
      console.log(`[native-products:scan] ${entry.name}: ${bodyClass}`);

      if (bodyTag && SINGLE_PRODUCT_CLASS_PATTERN.test(bodyTag)) {
        slugs.push(entry.name);
      }
    } catch {
      // Nested archive roots such as category/ and year folders do not have a
      // root index.html. They stay on the existing legacy/category routes.
    }
  }

  return slugs.sort();
}

const nativeProductSlugs = discoverNativeProductSlugs();
console.log(
  `[native-products] discovered ${nativeProductSlugs.length}: ${nativeProductSlugs.join(", ")}`,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/": ["./legacy-source/**/*"],
    "/[...slug]": ["./legacy-source/**/*"],
    "/native-product/[slug]": ["./legacy-source/**/*"],
    "/__legacy_asset/[...slug]": ["./legacy-source/**/*"],
  },
  async rewrites() {
    return {
      beforeFiles: nativeProductSlugs.map((slug) => ({
        source: `/${slug}/`,
        destination: `/native-product/${slug}/`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
};

export default nextConfig;
