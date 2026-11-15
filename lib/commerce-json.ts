import "server-only";

import { randomUUID } from "node:crypto";
import productsData from "@/data/products.json";
import supplierPhotoMap from "@/data/supplier-photo-map.json";
import type { ActivityRecord, OrderRecord, ProductRecord } from "@/lib/commerce-types";
import { ACTIVITY_PATH, ORDERS_PATH, PRODUCTS_PATH, mutateJsonStore, readJsonStore, usingCloudflareStore } from "@/lib/json-store";

const productSeed = productsData as unknown as ProductRecord[];
export const bundledProductCount = productSeed.length;

/** Use only verified supplier images while preserving genuinely custom D1 uploads.
 * For hair SKUs, the previous guessed Shopify URL and generated studio image are
 * explicitly recognized as legacy assets; no other merchant media is replaced.
 * Products absent from the official feed lose only their unverified photo. */
function withVerifiedSourcePhotos(rows: ProductRecord[]): ProductRecord[] {
  const bySlug = supplierPhotoMap as Record<string, {
    image_url: string | null;
    source_image_url?: string;
    legacy_image_url?: string;
    legacy_studio_image_url?: string;
    pre_refinement_image_url?: string;
    pre_bundle_image_url?: string;
    archived_bundle_composite_url?: string;
    verification_status?: string;
  }>;
  return rows.map(row => {
    const source = bySlug[row.slug];
    if (!source) return row;
    const isHair = row.brand === "OLIE'RE PARIS";
    if (isHair && (source.legacy_image_url || source.legacy_studio_image_url)) {
      const legacy = [
        source.legacy_image_url,
        source.legacy_studio_image_url,
        source.pre_refinement_image_url,
        source.pre_bundle_image_url,
        source.archived_bundle_composite_url,
        `/supplier-photos/bundles/${row.slug}.webp`,
        `/supplier-photos/isolated/${row.slug}.webp`,
        source.source_image_url,
        source.image_url,
      ];
      // An administrator's custom image must remain untouched.
      if (row.image_url && !legacy.includes(row.image_url)) return row;
      if (source.verification_status === "needs_review") return { ...row, image_url: null };
      if (source.image_url?.startsWith("/supplier-photos/")) return { ...row, image_url: source.image_url };
      return row;
    }
    if (!source.image_url?.startsWith("/supplier-photos/")) return row;
    if (row.image_url && row.image_url !== source.source_image_url) return row;
    return { ...row, image_url: source.image_url };
  });
}

/** Add only missing bundled products; never overwrite merchant-edited records. */
export function missingBundledProducts(current: ProductRecord[]): ProductRecord[] {
  const slugs = new Set(current.map(row => row.slug));
  const ids = new Set(current.map(row => row.id));
  return productSeed.filter(row => !slugs.has(row.slug) && !ids.has(row.id));
}


/**
 * Compatibility recovery for the initial isolated staging D1 setup.
 * The previous D1/GitHub store contained only the original Aesop product,
 * while 53 imported OLIE'RE items lived exclusively in version-controlled
 * hair-product JSON. Preserve existing edits and seed missing hair items.
 *
 * Do not apply this to the production site or to already migrated catalogs:
 * after the first admin write, all records are stored together in D1.
 */
function recoverLegacyStagingProducts(current: ProductRecord[]): ProductRecord[] {
  const isStagingD1 = process.env.SHOP_STAGING === "true"
    && usingCloudflareStore()
    && process.env.SHOP_PRODUCTS_BACKEND === "d1";
  if (!isStagingD1) return current;
  if (!current.some((item) => item.slug === "parsley-seed-anti-oxidant-eye-cream")) return current;
  if (current.some((item) => item.id.startsWith("oliere_hair_"))) return current;
  const known = new Set(current.map((item) => item.slug));
  const missing = productSeed.filter((item) =>
    item.id.startsWith("oliere_hair_") && !known.has(item.slug)
  );
  return missing.length ? [...current, ...missing] : current;
}

export async function readProducts() {
  const rows = (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, productSeed)).data;
  return withVerifiedSourcePhotos(recoverLegacyStagingProducts(rows).filter(row => row.slug !== "parsley-seed-anti-oxidant-eye-cream"));
}

export async function mutateProducts(
  message: string,
  mutate: (products: ProductRecord[]) => ProductRecord[] | Promise<ProductRecord[]>
) {
  return mutateJsonStore<ProductRecord[]>(PRODUCTS_PATH, productSeed, message,
    (rows) => mutate(recoverLegacyStagingProducts(rows).filter(row => row.slug !== "parsley-seed-anti-oxidant-eye-cream")));
}

export async function readOrders() {
  return (await readJsonStore<OrderRecord[]>(ORDERS_PATH, [])).data;
}

export async function mutateOrders(message: string, mutate: (orders: OrderRecord[]) => OrderRecord[] | Promise<OrderRecord[]>) {
  return mutateJsonStore<OrderRecord[]>(ORDERS_PATH, [], message, mutate);
}

export async function readActivity() {
  return (await readJsonStore<ActivityRecord[]>(ACTIVITY_PATH, [])).data;
}

export async function appendActivity(input: Omit<ActivityRecord, "id" | "created_at"> & { id?: number; created_at?: string }) {
  const entry: ActivityRecord = {
    id: input.id || Date.now(),
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    title: input.title,
    metadata: input.metadata || {},
    created_at: input.created_at || new Date().toISOString(),
  };
  await mutateJsonStore<ActivityRecord[]>(ACTIVITY_PATH, [], `Admin activity: ${entry.event_type}`, (items) => [entry, ...items].slice(0, 500));
  return entry;
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
