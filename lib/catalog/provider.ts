import type { Product } from "./product";

/**
 * Adapter boundary for the future admin panel.
 *
 * Until an admin/CMS is connected this intentionally returns no products,
 * rather than falling back to the placeholder WooCommerce archive.
 */
export async function getProductBySlug(_slug: string): Promise<Product | null> {
  return null;
}
