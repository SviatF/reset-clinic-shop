import { NextRequest } from "next/server";
import {
  findLegacyAsset,
  findLegacyDocument,
  readLegacyAsset,
  readLegacyDocument,
} from "../../lib/legacy-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function routeSegments(params: { slug?: string[] }) {
  return Array.isArray(params.slug) ? params.slug : [];
}

function htmlResponse(html: string) {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      "x-reset-renderer": "next-ssr-fidelity-baseline",
    },
  });
}

function binaryResponse(body: Buffer, contentType?: string) {
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "content-type": contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const params = await context.params;
  const segments = routeSegments(params);

  const asset = await findLegacyAsset(segments);
  if (asset && !asset.isHtml) {
    return binaryResponse(
      await readLegacyAsset(asset.filePath, asset.wrappedDownload),
      asset.contentType,
    );
  }

  const document = await findLegacyDocument(segments);
  if (document) {
    return htmlResponse(await readLegacyDocument(document));
  }

  // Query strings are deliberately left untouched. Legacy storefront links can
  // still carry WooCommerce parameters while route resolution stays pathname-only.
  void request;
  return new Response("Not Found", { status: 404 });
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const response = await GET(request, context);
  return new Response(null, { status: response.status, headers: response.headers });
}
