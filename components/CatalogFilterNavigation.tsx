"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ArrowUpRight from "@/components/ArrowUpRight";

type Category = "face" | "body" | "hair";
type CategoryLink = { slug: Category; label: string; description: string; count: number };
type SubcategoryLink = { slug: string; name: string; count: number };

type Props = {
  initialCategory?: Category;
  initialSubcategory?: string;
  categories: CategoryLink[];
  subcategories: SubcategoryLink[];
  brands: string[];
};

const xLabel = <span className="rs-filter-chip-clear" aria-hidden="true">×</span>;

/**
 * Read the live App Router search parameters rather than stale server-rendered
 * link targets. This allows an active brand/category chip to toggle itself off
 * immediately through client navigation without a hard page reload.
 */
export default function CatalogFilterNavigation({
  initialCategory, initialSubcategory, categories, subcategories, brands,
}: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const isCatalog = pathname === "/catalog";
  const currentCategory = isCatalog
    ? search.get("category") || undefined
    : initialCategory;
  const currentSubcategory = isCatalog
    ? search.get("subcategory") || undefined
    : initialSubcategory;
  const currentBrand = search.get("brand") || undefined;

  function destination(changes: {
    category?: string | null;
    subcategory?: string | null;
    brand?: string | null;
  }) {
    const next = new URLSearchParams(search.toString());

    // Physical category routes such as /face and /hair should retain their
    // category when switching a brand and moving to the unified catalog URL.
    if (!isCatalog && initialCategory) {
      next.set("category", initialCategory);
      if (initialSubcategory) next.set("subcategory", initialSubcategory);
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // Never show an empty old pagination page after filtering.
    const qs = next.toString();
    return qs ? `/catalog?${qs}` : "/catalog";
  }

  const withoutCategory = destination({ category: null, subcategory: null });
  const withoutBrand = destination({ brand: null });
  const withoutSubcategory = destination({ subcategory: null });

  return (
    <>
      <nav className="rs-mainnav" aria-label="Категорії">
        <Link prefetch={false} scroll={false} href={withoutCategory}
          aria-current={!currentCategory ? "page" : undefined}>
          <span className="rs-filter-chip-text">Усі товари</span>
        </Link>
        {categories.map((item) => {
          const active = currentCategory === item.slug;
          return (
            <Link key={item.slug} prefetch={false} scroll={false}
              href={active ? withoutCategory : destination({ category: item.slug, subcategory: null })}
              aria-current={active ? "page" : undefined}
              aria-label={active ? `Скинути категорію ${item.label}` : `Обрати категорію ${item.label}`}
              title={active ? `Скинути категорію: ${item.label}` : item.label}
              className={active ? "rs-filter-active" : undefined}>
              <span className="rs-filter-chip-text">{item.label} <small>{item.count}</small></span>
              {active && xLabel}
            </Link>
          );
        })}
      </nav>

      {currentCategory && subcategories.length > 0 && (
        <nav className="rs-subnav" aria-label="Підкатегорії">
          <Link prefetch={false} scroll={false} href={withoutSubcategory}
            aria-current={!currentSubcategory ? "page" : undefined}>
            <span>Усі засоби</span>
          </Link>
          {subcategories.map((item) => {
            const active = currentSubcategory === item.slug;
            return (
              <Link key={item.slug} prefetch={false} scroll={false}
                href={active ? withoutSubcategory : destination({ subcategory: item.slug })}
                aria-current={active ? "page" : undefined}
                aria-label={active ? `Скинути підкатегорію ${item.name}` : `Обрати підкатегорію ${item.name}`}
                className={active ? "rs-filter-active" : undefined}>
                <span className="rs-filter-chip-text">{item.name}</span>
                {active ? xLabel : <small>{item.count}</small>}
              </Link>
            );
          })}
        </nav>
      )}

      {!currentCategory && (
        <nav className="rs-featured" aria-label="Обрати напрям">
          {categories.map((item) => (
            <Link key={item.slug} prefetch={false} scroll={false}
              href={destination({ category: item.slug, subcategory: null })}>
              <strong>{item.label}</strong><small>{item.count} товарів</small>
              <b aria-hidden="true"><ArrowUpRight /></b>
            </Link>
          ))}
        </nav>
      )}

      <nav className="rs-brand-nav" id="brands" aria-label="Каталог за брендом">
        <span className="rs-brand-nav-label">БРЕНДИ</span>
        <Link prefetch={false} scroll={false} href={withoutBrand}
          aria-current={!currentBrand ? "page" : undefined}>
          Усі бренди
        </Link>
        {brands.map((brand) => {
          const active = currentBrand?.toLocaleLowerCase("uk") === brand.toLocaleLowerCase("uk");
          return (
            <Link key={brand} prefetch={false} scroll={false}
              href={active ? withoutBrand : destination({ brand })}
              aria-current={active ? "page" : undefined}
              aria-label={active ? `Скинути бренд ${brand}` : `Обрати бренд ${brand}`}
              title={active ? `Скинути бренд: ${brand}` : brand}
              className={active ? "rs-filter-active" : undefined}>
              <span className="rs-filter-chip-text">{brand}</span>
              {active ? xLabel : <ArrowUpRight />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
