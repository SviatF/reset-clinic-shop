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
    "id": "face-cream",
    "slug": "cream",
    "name": "Крем",
    "parent_slug": "face",
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
    "name": "Активи / сироватки",
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
    "name": "SPF",
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
    "name": "Крем",
    "parent_slug": "body",
    "sort_order": 20,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  },
  {
    "id": "body-spf",
    "slug": "spf",
    "name": "SPF",
    "parent_slug": "body",
    "sort_order": 30,
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
    "name": "Шампунь",
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
    "name": "Кондиціонер",
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
    "name": "Маска",
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
    "name": "Стайлінг",
    "parent_slug": "hair",
    "sort_order": 40,
    "status": "active",
    "description": "",
    "seo_title": "",
    "seo_description": ""
  }
];
export function inferredSubcategories(name:string,category:string):string[]{
 const n=name.toLocaleLowerCase("uk");
 if(category==="hair"){
  if(/шампун|shampoo/.test(n))return ["shampoo"];
  if(/кондиціонер|conditioner/.test(n))return ["conditioner"];
  if(/маска|mask/.test(n))return ["mask"];
  if(/стайл|лак|мус|віск|гель|spray|спрей|styling/.test(n))return ["styling"];
 }
 if(category==="face"||category==="body"){
  if(/spf|сонцезахис|sun.?cream|sunscreen|uv.derm/.test(n))return ["spf"];
  if(/пінка|гель для вмиван|очищ|cleanser|cleansing|mousse|wash/.test(n))return ["cleansing"];
  if(category==="face"&&/тонік|тонер|toner|tonic|тоніз/.test(n))return ["toning"];
  if(category==="face"&&/сироват|серум|serum|ampoule|ампул|актив/.test(n))return ["serums"];
  if(/крем|cream|бальзам|lotion|лосьйон/.test(n))return ["cream"];
 }
 return [];
}
