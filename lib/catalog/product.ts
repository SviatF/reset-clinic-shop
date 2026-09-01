export type ProductImage = {
  id: string;
  url: string;
  alt: string;
};

export type ProductOptionValue = {
  id: string;
  label: string;
  available: boolean;
};

export type ProductOption = {
  id: string;
  label: string;
  values: ProductOptionValue[];
};

export type ProductSpecification = {
  label: string;
  value: string;
};

/**
 * The storefront product contract.
 *
 * The future admin panel should return this shape. The UI deliberately does
 * not contain a local seed catalogue: no archived/demo products are published.
 */
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: {
    name: string;
    slug: string;
  };
  price: {
    amount: number;
    currency: "UAH" | "EUR" | "USD";
  };
  compareAtPrice?: {
    amount: number;
    currency: "UAH" | "EUR" | "USD";
  };
  images: ProductImage[];
  shortDescription?: string;
  description?: string;
  specifications?: ProductSpecification[];
  options?: ProductOption[];
  sku?: string;
  inStock: boolean;
};

