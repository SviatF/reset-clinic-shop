import { findLegacyAsset, readLegacyAsset } from "../../../lib/legacy-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  _request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  const asset = await findLegacyAsset(slug);

  if (!asset || asset.isHtml) {
    return new Response("Not Found", { status: 404 });
  }

  return binaryResponse(
    await readLegacyAsset(asset.filePath, asset.wrappedDownload),
    asset.contentType,
  );
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  const response = await GET(request, context);
  return new Response(null, { status: response.status, headers: response.headers });
}
