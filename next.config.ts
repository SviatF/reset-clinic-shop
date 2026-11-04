import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [{ source: "/faq", destination: "/clients/faq", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        {key:"X-Content-Type-Options",value:"nosniff"},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
        {key:"X-Frame-Options",value:"DENY"},
        {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
      ]},
      {
        source: "/admin",
        headers: noIndexHeaders,
      },
      {
        source: "/admin/:path*",
        headers: noIndexHeaders,
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
