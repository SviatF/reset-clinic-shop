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
 * The future admin panel should return this shape. The repository keeps only
 * one explicitly marked test product and never republishes the archived list.
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
