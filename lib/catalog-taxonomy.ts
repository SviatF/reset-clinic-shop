export type StoreCategory = {id:string;slug:string;name:string;parent_slug:string|null;sort_order:number;status:"active"|"hidden";description:string;seo_title:string;seo_description:string};
export const DEFAULT_CATEGORIES:StoreCategory[]=[
  {
    "id": "face",
    "slug": "face",
    "name": "Обличчя",
    "parent_slug": null,
    "sort_order": 10,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "face-cleansing",
    "slug": "cleansing",
    "name": "Очищення",
    "parent_slug": "face",
    "sort_order": 10,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "face-cream",
    "slug": "cream",
    "name": "Креми",
    "parent_slug": "face",
    "sort_order": 20,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "face-toning",
    "slug": "toning",
    "name": "Тонізація",
    "parent_slug": "face",
    "sort_order": 30,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "face-serums",
    "slug": "serums",
    "name": "Активи та сироватки",
    "parent_slug": "face",
    "sort_order": 40,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "face-spf",
    "slug": "spf",
    "name": "SPF-засоби",
    "parent_slug": "face",
    "sort_order": 50,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "body",
    "slug": "body",
    "name": "Тіло",
    "parent_slug": null,
    "sort_order": 20,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "body-cleansing",
    "slug": "cleansing",
    "name": "Очищення",
    "parent_slug": "body",
    "sort_order": 10,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "body-cream",
    "slug": "cream",
    "name": "Зволоження",
    "parent_slug": "body",
    "sort_order": 20,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "body-treatment",
    "slug": "treatment",
    "name": "Активи та лікувальні засоби",
    "parent_slug": "body",
    "sort_order": 30,
    "status": "active",
    "description": "Цільові засоби для активного та лікувального догляду за тілом.",
    "seo_title": "Активний та лікувальний догляд за тілом — RESET Clinic",
    "seo_description": "Активні та лікувальні засоби для догляду за шкірою тіла. Професійний підбір RESET Clinic."
  },
  {
    "id": "body-spf",
    "slug": "spf",
    "name": "SPF-засоби",
    "parent_slug": "body",
    "sort_order": 40,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "hair",
    "slug": "hair",
    "name": "Волосся",
    "parent_slug": null,
    "sort_order": 30,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "hair-shampoo",
    "slug": "shampoo",
    "name": "Шампуні",
    "parent_slug": "hair",
    "sort_order": 10,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "hair-conditioner",
    "slug": "conditioner",
    "name": "Кондиціонери",
    "parent_slug": "hair",
    "sort_order": 20,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "hair-mask",
    "slug": "mask",
    "name": "Маски",
    "parent_slug": "hair",
    "sort_order": 30,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "hair-styling",
    "slug": "styling",
    "name": "Стайлінгові засоби",
    "parent_slug": "hair",
    "sort_order": 40,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  }
];
/**
 * Compatibility classifier for legacy products that predate subcategories.
 * Never override an explicit assignment (including an intentionally empty list).
 */
export function inferredSubcategories(name: string, category: string): string[] {
  const n = name.toLocaleLowerCase("uk");
  if (category === "hair") {
    if (/набір|комбо|комбінован/.test(n)) {
      if (/шампун/.test(n) && /маск/.test(n)) return ["shampoo","mask"];
      if (/шампун/.test(n) && /кондиціонер/.test(n)) return ["shampoo","conditioner"];
      if (/стайл|укладан|спрей та|створення додаткових локонів|формування локонів/.test(n)) return ["styling"];
      return [];
    }
    if (/шампун|shampoo/.test(n)) return ["shampoo"];
    if (/кондиціонер|conditioner/.test(n)) return ["conditioner"];
    if (/маск|mask/.test(n)) return ["mask"];
    if (/(?:^|\s)(?:мус|лак|віск|гель)|стайл|укладан|крем-глазур/.test(n)) return ["styling"];
    return [];
  }
  if (category === "face" || category === "body") {
    if (/spf|сонцезахис|sun.?cream|sunscreen|uv.?derm/.test(n)) return ["spf"];
    if (/пінка|вмиван|очищ|cleanser|cleansing|mousse|wash/.test(n)) return ["cleansing"];
    if (category === "face" && /тонік|тонер|toner|tonic|тоніз/.test(n)) return ["toning"];
    if (category === "face" && /сироват|серум|serum|ampoule|ампул|актив/.test(n)) return ["serums"];
    if (/крем|cream|бальзам|lotion|лосьйон/.test(n)) return ["cream"];
  }
  return [];
}

/** Explicit assignments always win, including [] to leave an item unassigned. */
export function productSubcategories(item: { name: string; category: string; subcategory_slugs?: string[] }): string[] {
  return Array.isArray(item.subcategory_slugs)
    ? item.subcategory_slugs
    : inferredSubcategories(item.name, item.category);
}
