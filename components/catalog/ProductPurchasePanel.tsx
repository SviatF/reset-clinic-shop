"use client";

import { useMemo, useState } from "react";
import type { ProductOption } from "../../lib/catalog/product";
import styles from "./product-page.module.css";

type ProductPurchasePanelProps = {
  productId: string;
  slug: string;
  productName: string;
  price: number;
  currency: "UAH" | "EUR" | "USD";
  image?: string;
  inStock: boolean;
  options?: ProductOption[];
};

export function ProductPurchasePanel({
  productId,
  slug,
  productName,
  price,
  currency,
  image,
  inStock,
  options = [],
}: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const hasAllOptions = useMemo(
    () => options.every((option) => Boolean(selectedOptions[option.id])),
    [options, selectedOptions],
  );
  const canAddToCart = inStock && hasAllOptions;

  return (
    <form
      className={styles.purchaseForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canAddToCart) return;

        window.dispatchEvent(
          new CustomEvent("reset:add-to-cart", {
            detail: {
              productId,
              slug,
              name: productName,
              price,
              currency,
              image,
              quantity,
              options: selectedOptions,
            },
          }),
        );
      }}
    >
      {options.map((option) => (
        <fieldset className={styles.optionGroup} key={option.id}>
          <legend>{option.label}</legend>
          <div className={styles.optionValues}>
            {option.values.map((value) => (
              <label className={styles.optionValue} data-disabled={!value.available} key={value.id}>
                <input
                  type="radio"
                  name={option.id}
                  value={value.id}
                  disabled={!value.available}
                  checked={selectedOptions[option.id] === value.id}
                  onChange={() =>
                    setSelectedOptions((current) => ({ ...current, [option.id]: value.id }))
                  }
                />
                <span>{value.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className={styles.purchaseRow}>
        <div className={styles.quantity} aria-label="Кількість">
          <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
            −
          </button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" onClick={() => setQuantity((current) => current + 1)}>
            +
          </button>
        </div>
        <button className={styles.addToCart} type="submit" disabled={!canAddToCart}>
          {inStock ? "Додати в кошик" : "Немає в наявності"}
        </button>
      </div>
    </form>
  );
}
