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
  },
  {
    "id": "face-eye-care",
    "slug": "eye-care",
    "name": "Догляд за очима",
    "parent_slug": "face",
    "sort_order": 60,
    "description": "Засоби для делікатного догляду за зоною навколо очей.",
    "status": "active",
    "seo_title": "Догляд за очима — RESET Clinic",
    "seo_description": "Засоби для делікатного догляду за зоною навколо очей."
  },
  {
    "id": "face-lip-care",
    "slug": "lip-care",
    "name": "Догляд за губами",
    "parent_slug": "face",
    "sort_order": 70,
    "description": "Професійний догляд, відновлення та захист губ.",
    "status": "active",
    "seo_title": "Догляд за губами — RESET Clinic",
    "seo_description": "Професійний догляд, відновлення та захист губ."
  },
  {
    "id": "face-spot-treatment",
    "slug": "spot-treatment",
    "name": "Точкові засоби",
    "parent_slug": "face",
    "sort_order": 80,
    "description": "Засоби для локального нанесення на проблемні ділянки шкіри.",
    "status": "active",
    "seo_title": "Точкові засоби — RESET Clinic",
    "seo_description": "Засоби для локального нанесення на проблемні ділянки шкіри."
  },
  {
    "id": "body-hand-care",
    "slug": "hand-care",
    "name": "Догляд за руками",
    "parent_slug": "body",
    "sort_order": 50,
    "description": "Професійні засоби для шкіри рук.",
    "status": "active",
    "seo_title": "Догляд за руками — RESET Clinic",
    "seo_description": "Професійні засоби для шкіри рук."
  },
  {
    "id": "hair-treatment",
    "slug": "treatment",
    "name": "Лікувальні засоби",
    "parent_slug": "hair",
    "sort_order": 50,
    "description": "Цільовий догляд за шкірою голови та волоссям.",
    "status": "active",
    "seo_title": "Лікувальні засоби — RESET Clinic",
    "seo_description": "Цільовий догляд за шкірою голови та волоссям."
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

/**
 * Specialist categories are additive: an eye cream remains a cream.
 * Exact product-name signals avoid confusing "очищення" with eye care.
 */
export function specialistSubcategories(name: string, category: string): string[] {
  const n = name.toLocaleLowerCase("uk");
  const matches: string[] = [];
  if (category === "face") {
    if (/(?:^|[^a-z])eyes?(?:$|[^a-z])|eyelid|eye.?contour|навколо\s+оч|для\s+оч(?:ей)?(?=$|[^а-яіїєґ])|під\s+очима|повік|патч.{0,20}оч/iu.test(n)) matches.push("eye-care");
    if (/(?:^|[^a-z])lips?(?:$|[^a-z])|для\s+губ|на\s+губ|бальзам\s+для\s+губ/iu.test(n)) matches.push("lip-care");
    if (/(?:^|[^a-z])spot(?:$|[^a-z])|(?:^|[^a-z])sos(?:$|[^a-z])|точков|локальн|підсушувальн/iu.test(n)) matches.push("spot-treatment");
  }
  if (category === "body" && (/(?:^|[^a-z])hands?(?:$|[^a-z])|для\s+рук|догляд\s+за\s+руками/iu.test(n))) matches.push("hand-care");
  if (category === "hair" && (/лікувальн|проти\s+лупи|від\s+лупи|anti[-\s]?dandruff|dandruff|hair\s*loss|проти\s+випадін|від\s+випадін|себор|псор|psor|алопец|alopecia|дерматит/iu.test(n))) matches.push("treatment");
  return matches;
}

/** Explicit assignments always win, including [] to leave an item unassigned. */
export function productSubcategories(item: { name: string; category: string; subcategory_slugs?: string[] }): string[] {
  // Respect intentionally empty merchant-assigned lists.
  if (Array.isArray(item.subcategory_slugs) && item.subcategory_slugs.length === 0) return [];
  const assigned = Array.isArray(item.subcategory_slugs)
    ? item.subcategory_slugs
    : inferredSubcategories(item.name, item.category);
  return [...new Set([...assigned, ...specialistSubcategories(item.name, item.category)])];
}
