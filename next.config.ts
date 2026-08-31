import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/": ["./legacy-source/**/*"],
    "/[...slug]": ["./legacy-source/**/*"],
    "/__legacy_asset/[...slug]": ["./legacy-source/**/*"],
  },
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
};

export default nextConfig;
