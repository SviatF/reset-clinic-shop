import snapshot from "../../data/cu-skin-official-snapshot.json" with { type: "json" };

// A zero-price listing is a catalog-only listing. It is visible and has a
// verified photo, but checkout must stay disabled until its retail price and
// actual stock are entered. Do not invent supplier prices or stock.
const official = new Map(snapshot.products.map(p => [String(p.sku), String(p.vendorCode)]));

export function eligibleForCatalogRelease(product) {
  if (!product || product.brand !== "CU SKIN" || product.status !== "draft" ||
      !official.has(String(product.sku)) ||
      product.id !== "cu-official-" + official.get(String(product.sku)) ||
      !(Number(product.price) >= 0) || !Number.isFinite(Number(product.price))) return false;
  // Only auto-created draft rows that have their own, verified official image.
  const prefix = "/shop-media/products/cu-skin-official/" + official.get(String(product.sku)) + "-";
  return String(product.image_url || "").startsWith(prefix);
}

export async function releaseOfficialCUListings(env) {
  for (let retry = 0; retry < 7; retry++) {
    const row = await env.SHOP_DB.prepare(
      "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'"
    ).first();
    if (!row) throw Error("D1 catalog document missing");
    const products = JSON.parse(row.content);
    if (!Array.isArray(products) || products.length < 300) throw Error("Unexpected catalog size; abort release");
    const seen = new Map();
    for (const p of products) if (p.brand === "CU SKIN" && p.sku) {
      seen.set(String(p.sku), (seen.get(String(p.sku)) || 0) + 1);
    }
    const now = new Date().toISOString();
    let published = 0, excluded = 0;
    const updated = products.map(p => {
      if (!eligibleForCatalogRelease(p)) return p;
      if (seen.get(String(p.sku)) !== 1) { excluded++; return p; }
      published++;
      return { ...p, status:"active", published_at:p.published_at || now, updated_at:now };
    });
    if (published === 0) return {published:0,excluded,alreadyReleased:products.filter(p =>
       p.brand === "CU SKIN" && p.status === "active" && String(p.id).startsWith("cu-official-")).length};
    const result = await env.SHOP_DB.prepare(
      "UPDATE shop_documents SET content=?,version=version+1,updated_at=datetime('now') WHERE pathname='data/products.json' AND version=?"
    ).bind(JSON.stringify(updated),Number(row.version)).run();
    if ((result.meta?.changes||0)>0) {
      console.log("CU SKIN source-draft catalog release",JSON.stringify({published,excluded}));
      return {published,excluded};
    }
  }
  throw Error("Concurrent D1 catalog changes prevented CU SKIN publishing");
}
