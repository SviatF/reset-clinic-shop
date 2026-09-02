import Image from "next/image";
import Link from "next/link";
import styles from "./CategoryShowcase.module.css";

const categories = [
  {
    key: "body",
    label: "Тіло",
    href: "/product-category/body/",
    image: "/category/body.webp",
  },
  {
    key: "face",
    label: "Обличчя",
    href: "/product-category/face/",
    image: "/category/face.webp",
  },
  {
    key: "hair",
    label: "Волосся",
    href: "/product-category/hair/",
    image: "/category/hair.webp",
  },
] as const;

export function CategoryShowcase() {
  return (
    <section className={styles.section} aria-labelledby="home-category-title">
      <div className={styles.inner}>
        <h2 className={styles.title} id="home-category-title">
          Оберіть
          <br />
          категорію
        </h2>

        <div className={styles.grid}>
          {categories.map((category) => (
            <Link
              className={`${styles.card} ${styles[category.key]}`}
              href={category.href}
              key={category.key}
            >
              <span className={styles.imageWrap}>
                <Image
                  alt={category.label}
                  className={styles.image}
                  fill
                  sizes="(max-width: 767px) 88vw, (max-width: 1199px) 30vw, 300px"
                  src={category.image}
                />
              </span>
              <span className={styles.label}>{category.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
