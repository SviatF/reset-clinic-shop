import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/": ["./content/native/**/*"],
    "/[[...slug]]": ["./content/native/**/*"],
    "/product/[slug]": ["./content/native/**/*"],
    "/product-category/[...slug]": ["./content/native/**/*"],
    "/shop/[[...page]]": ["./content/native/**/*"],
    "/cart": ["./content/native/**/*"],
    "/checkout": ["./content/native/**/*"],
  },
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
};

export default nextConfig;
