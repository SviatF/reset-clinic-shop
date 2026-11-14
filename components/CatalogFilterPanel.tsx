"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Category = "face" | "body" | "hair";

export default function CatalogFilterPanel({
  initialCategory,
  initialSubcategory,
  brands,
}: {
  initialCategory?: Category;
  initialSubcategory?: string;
  brands: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const inCatalog = pathname === "/catalog";
  const category = inCatalog ? search.get("category") : initialCategory;
  const subcategory = inCatalog ? search.get("subcategory") : initialSubcategory;
  const selectedBrand = search.get("brand") || "";
  const q = search.get("q") || "";
  const sort = search.get("sort") || "default";
  const hasFilters = Boolean(category || subcategory || selectedBrand || q || (sort !== "default"));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const params = new URLSearchParams(search.toString());

    if (!inCatalog && initialCategory) {
      params.set("category", initialCategory);
      if (initialSubcategory) params.set("subcategory", initialSubcategory);
    }

    for (const key of ["q", "brand", "sort"] as const) {
      const value = String(values.get(key) ?? "").trim();
      if (!value || (key === "sort" && value === "default")) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const next = params.toString();
    router.push(next ? `/catalog?${next}` : "/catalog", { scroll: false });
    // Close immediately; selected values then sync from live URL parameters.
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <div className="rs-filter-actions">
      {hasFilters && (
        <Link className="rs-filters-reset-all" prefetch={false} scroll={false}
          href="/catalog" aria-label="Скинути всі фільтри каталогу">
          Скинути все <span aria-hidden="true">×</span>
        </Link>
      )}
      <details className="rs-filters" key={pathname + ":" + search.toString()}>
        <summary>☷ Фільтр і сортування <span aria-hidden="true">⌄</span></summary>
        <form className="rs-filter-fields" onSubmit={handleSubmit}>
          <label>Пошук
            <input type="search" name="q" defaultValue={q} placeholder="Назва або артикул" />
          </label>
          <label>Бренд
            <select name="brand" defaultValue={selectedBrand}>
              <option value="">Усі бренди</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label>Сортувати
            <select name="sort" defaultValue={sort}>
              <option value="default">Рекомендовані</option>
              <option value="price-asc">Спочатку дешевші</option>
              <option value="price-desc">Спочатку дорожчі</option>
              <option value="name">За назвою</option>
            </select>
          </label>
          <button type="submit">Показати товари →</button>
          {hasFilters && (
            <Link href="/catalog" prefetch={false} scroll={false}>Скинути всі критерії</Link>
          )}
        </form>
      </details>
    </div>
  );
}
