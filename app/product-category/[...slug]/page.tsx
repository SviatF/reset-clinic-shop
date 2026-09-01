import { CatalogPage } from "../../../components/catalog/CatalogPage";
import { NativeShell } from "../../../components/shop/NativePage";
import { listProducts } from "../../../lib/catalog/provider";

const TITLES: Record<string, string> = {
  face: "Обличчя",
  body: "Тіло",
  hair: "Волосся",
  gifts: "Подарунки",
  "day-night-cream": "Денні та нічні креми",
  "eye-cream": "Креми для очей",
  "facial-oil-serum": "Олії та сироватки",
  "scrub-cleansers": "Скраби та очищення",
  "sun-face-cream": "Сонцезахисні засоби",
  "body-lotions": "Лосьйони для тіла",
  "body-oils": "Олії для тіла",
  "hand-foot-creams": "Креми для рук і ніг",
  "personal-care": "Особистий догляд",
  "self-tanning": "Автозасмага",
  conditioners: "Кондиціонери",
  "hair-treatments": "Догляд за волоссям",
  shampoo: "Шампуні",
  "shampoo-bars": "Тверді шампуні",
  styling: "Стайлінг",
};

type CategoryPageProps = { params: Promise<{ slug: string[] }> };

export default async function ProductCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = slug.filter((part) => part !== "page" && !/^\d+$/.test(part)).at(-1) ?? "shop";
  const products = await listProducts(category);
  return <NativeShell><CatalogPage title={TITLES[category] ?? category} products={products} /></NativeShell>;
}
