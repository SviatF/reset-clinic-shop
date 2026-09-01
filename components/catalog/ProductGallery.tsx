"use client";

import { useState } from "react";
import type { ProductImage } from "../../lib/catalog/product";
import styles from "./product-page.module.css";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeImageId, setActiveImageId] = useState(images[0]?.id);
  const activeImage = images.find((image) => image.id === activeImageId) ?? images[0];

  if (!activeImage) {
    return <div className={styles.imagePlaceholder} aria-label={`Фото ${productName} ще не додано`} />;
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageFrame}>
        <img className={styles.mainImage} src={activeImage.url} alt={activeImage.alt || productName} />
      </div>

      {images.length > 1 ? (
        <div className={styles.thumbnails} aria-label="Галерея товару">
          {images.map((image) => (
            <button
              className={styles.thumbnailButton}
              data-active={image.id === activeImage.id}
              key={image.id}
              type="button"
              onClick={() => setActiveImageId(image.id)}
              aria-label={`Показати: ${image.alt || productName}`}
              aria-pressed={image.id === activeImage.id}
            >
              <img className={styles.thumbnailImage} src={image.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

