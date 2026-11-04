import "server-only";
import { CATEGORIES_PATH, readJsonStore, mutateJsonStore } from "@/lib/json-store";
import { DEFAULT_CATEGORIES, type StoreCategory } from "@/lib/catalog-taxonomy";

/**
 * Existing D1 documents can contain old category labels. Upgrade the known
 * legacy labels and category order in memory, while keeping custom category
 * names, descriptions, visibility, SEO fields and user-created categories.
 * Persist the upgraded snapshot on the next successful admin mutation.
 */
const LEGACY_LABELS: Record<string, string[]> = {
  "face-cream": ["Крем"],
  "face-serums": ["Активи/сироватки", "Активи / сироватки"],
  "face-spf": ["SPF"],
  "body-cream": ["Крем"],
  "body-spf": ["SPF"],
  "hair-shampoo": ["Шампунь"],
  "hair-conditioner": ["Кондиціонер"],
  "hair-mask": ["Маска"],
  "hair-styling": ["Стайлінг", "Стайлінги"],
};

const LEGACY_SORT_ORDER: Record<string, number> = {
  "face-cream": 10,
  "face-cleansing": 20,
  "body-spf": 30,
};

export function withRequiredCategories(rows: StoreCategory[]): StoreCategory[] {
  const current = new Map(rows.map(row => [row.id, row]));
  for (const required of DEFAULT_CATEGORIES) {
    const existing = current.get(required.id);
    if (!existing) {
      current.set(required.id, required);
      continue;
    }
    const rename = LEGACY_LABELS[required.id]?.includes(existing.name) || false;
    const oldOrder = LEGACY_SORT_ORDER[required.id];
    const reorder = oldOrder !== undefined && existing.sort_order === oldOrder;
    if (rename || reorder) {
      current.set(required.id, {
        ...existing,
        name: rename ? required.name : existing.name,
        sort_order: reorder ? required.sort_order : existing.sort_order,
      });
    }
  }
  return [...current.values()];
}

export async function readCategories(): Promise<StoreCategory[]> {
  const { data } = await readJsonStore<StoreCategory[]>(CATEGORIES_PATH, DEFAULT_CATEGORIES);
  return withRequiredCategories(Array.isArray(data) ? data : []);
}

export async function mutateCategories(
  message: string,
  mutate: (rows: StoreCategory[]) => StoreCategory[]
) {
  return mutateJsonStore<StoreCategory[]>(CATEGORIES_PATH, DEFAULT_CATEGORIES, message,
    rows => mutate(withRequiredCategories(rows)));
}
