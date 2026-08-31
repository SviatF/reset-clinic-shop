import { NextRequest, NextResponse } from "next/server";

const LEGACY_ASSET_EXTENSION = /\.(?:css|js|mjs|cjs|json|map|xml|txt|jpg|jpeg|png|webp|gif|svg|ico|avif|bmp|woff|woff2|ttf|otf|eot|mp4|webm|mov|mp3|wav|pdf|zip|br|gz)$/i;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next/") || pathname.startsWith("/__legacy_asset/")) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-reset-path", pathname);

  if (LEGACY_ASSET_EXTENSION.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/__legacy_asset${pathname}`;
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/:path*",
};
