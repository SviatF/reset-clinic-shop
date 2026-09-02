import type { Product } from "./product";

/** The only local item: a temporary card for testing the storefront structure. */
const STRUCTURE_TEST_PRODUCT: Product = {
  id: "structure-test-product",
  slug: "test-product",
  name: "Тестовий товар",
  category: { name: "Обличчя", slug: "face" },
  price: { amount: 1000, currency: "UAH" },
  images: [],
  shortDescription: "Технічна картка для перевірки структури магазину.",
  description:
    "Це єдина демонстраційна позиція. Адміністратор замінить її реальними товарами через адмін-панель.",
  specifications: [
    { label: "Призначення", value: "Перевірка шаблону товару" },
    { label: "Джерело", value: "Тимчасові локальні дані" },
  ],
  options: [
    {
      id: "variant",
      label: "Варіант",
      values: [{ id: "standard", label: "Стандарт", available: true }],
    },
  ],
  sku: "TEST-001",
  inStock: true,
};

/**
 * Adapter boundary for the future admin panel.
 *
 * Once an admin/CMS is connected, only these functions need replacement.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return slug === STRUCTURE_TEST_PRODUCT.slug ? STRUCTURE_TEST_PRODUCT : null;
}

export async function listProducts(category?: string): Promise<Product[]> {
  if (category && category !== STRUCTURE_TEST_PRODUCT.category.slug) return [];
  return [STRUCTURE_TEST_PRODUCT];
}
