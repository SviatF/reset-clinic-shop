import hairBatch1 from "@/data/hair-products-1.json";
import hairBatch2 from "@/data/hair-products-2.json";
import hairBatch3 from "@/data/hair-products-3.json";
import type { ProductRecord } from "@/lib/commerce-types";
type HairSeedSource = { slug: string; name: string; price: number; size: string | null; image: string | null; short: string };
const HAIR_IMPORTED_AT = "2026-09-03T00:00:00.000Z";
const hairSource = [...hairBatch1, ...hairBatch2, ...hairBatch3] as HairSeedSource[];

function hairHover(name: string) {
  const value = name.toLowerCase();
  if (value.includes("набір")) return ["КОМПЛЕКСНИЙ ДОГЛЯД", "Повна система", "Кілька етапів в одному наборі"] as const;
  if (value.includes("шампун")) return ["ПРИЗНАЧЕННЯ", "Очищення + догляд", "Для професійної рутини волосся"] as const;
  if (value.includes("маска") && !value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Живлення + відновлення", "Для довжини та якості волосся"] as const;
  if (value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Захист + керованість", "Незмивний догляд для волосся"] as const;
  if (value.includes("сироват")) return ["ПРИЗНАЧЕННЯ", "Блиск + захист", "Фінішний догляд без обтяження"] as const;
  if (value.includes("кондиціон")) return ["ПРИЗНАЧЕННЯ", "М’якість + розгладження", "Після очищення волосся"] as const;
  if (value.includes("віск") || value.includes("гель") || value.includes("мус") || value.includes("лак")) return ["СТАЙЛІНГ", "Форма + фіксація", "Професійний контроль укладки"] as const;
  return ["ДОГЛЯД ЗА ВОЛОССЯМ", "Професійний догляд", "OLIE'RE PARIS"] as const;
}

function hairRecord(item: HairSeedSource, index: number): ProductRecord {
  const [hoverLabel, hoverTitle, hoverText] = hairHover(item.name);
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `oliere_hair_${number}`,
    slug: item.slug,
    name: item.name,
    brand: "OLIE'RE PARIS",
    sku: `OLIERE-${number}`,
    category: "hair",
    status: "active",
    short_description: item.short,
    description: item.short,
    price: Number(item.price),
    currency: "UAH",
    stock_quantity: 0,
    track_stock: false,
    size: item.size,
    image_url: item.image,
    secondary_image_url: null,
    hover_label: hoverLabel,
    hover_title: hoverTitle,
    hover_text: hoverText,
    how_to_use: null,
    key_ingredients: [],
    inci: null,
    seo_title: `${item.name} — купити в RESET Clinic`,
    seo_description: `${item.short}. OLIE'RE PARIS у RESET Clinic з доставкою по Україні.`,
    seo_keywords: ["OLIE'RE PARIS", "професійна косметика для волосся", "догляд за волоссям"],
    featured: false,
    sort_order: index + 1,
    published_at: HAIR_IMPORTED_AT,
    created_at: HAIR_IMPORTED_AT,
    updated_at: HAIR_IMPORTED_AT,
  };
}


export const hairSeeds: ProductRecord[] = hairSource.map(hairRecord);
