import { closeSync, openSync, readSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { NextConfig } from "next";

const LEGACY_SOURCE_DIR = join(process.cwd(), "legacy-source");
const BODY_TAG_PATTERN = /<body\b[^>]*>/i;
const SINGLE_PRODUCT_CLASS_PATTERN = /\bclass=(["'])[^"']*\bsingle-product\b[^"']*\1/i;
const SKIPPED_ARCHIVE_DIRS = new Set(["assets", "node_modules", ".git"]);

type NativeProductRoute = {
  source: string;
  destination: string;
};

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

function archiveDirectoryToPath(directory: string) {
  const relativePath = relative(LEGACY_SOURCE_DIR, directory);
  const segments = relativePath.split(sep).filter(Boolean);
  return `/${segments.join("/")}/`;
}

function discoverNativeProductRoutes() {
  const routes: NativeProductRoute[] = [];

  function scan(directory: string) {
    try {
      const bodyTag = readArchivedBodyTag(join(directory, "index.html"));

      if (bodyTag && SINGLE_PRODUCT_CLASS_PATTERN.test(bodyTag)) {
        const source = archiveDirectoryToPath(directory);
        const pathWithoutOuterSlashes = source.replace(/^\/+|\/+$/g, "");

        if (pathWithoutOuterSlashes) {
          routes.push({
            source,
            destination: `/native-product/${pathWithoutOuterSlashes}/`,
          });
        }
      }
    } catch {
      // A directory without index.html can still contain archived page folders,
      // so continue recursively below.
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIPPED_ARCHIVE_DIRS.has(entry.name)) continue;
      scan(join(directory, entry.name));
    }
  }

  scan(LEGACY_SOURCE_DIR);
  return routes.sort((a, b) => a.source.localeCompare(b.source));
}

const nativeProductRoutes = discoverNativeProductRoutes();
console.log(
  `[native-products] discovered ${nativeProductRoutes.length}: ${nativeProductRoutes
    .map((route) => route.source)
    .join(", ")}`,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/": ["./legacy-source/**/*"],
    "/[...slug]": ["./legacy-source/**/*"],
    "/native-product/[...slug]": ["./legacy-source/**/*"],
    "/__legacy_asset/[...slug]": ["./legacy-source/**/*"],
  },
  async rewrites() {
    return {
      beforeFiles: nativeProductRoutes,
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
