/** RESET Clinic Ready Basket navigation. Keys are stable DB identifiers.
 * Concern-category photographs are original RESET Clinic skincare visuals, optimized
 * as local WebP files. Admin image overrides remain available through D1/R2.
 * Skin-type cards retain their existing stock imagery.
 */
export type ReadyBasketCategoryKind = "skin" | "concern";
export type ReadyBasketCategory = {
 key: string; label: string; kind: ReadyBasketCategoryKind; description: string;
 defaultImage: string | null;
};
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=520&q=82`;
export const READY_BASKET_CATEGORIES: ReadyBasketCategory[] = [
 { key:"skin-dry",label:"Суха",kind:"skin",description:"Комфорт і зволоження",defaultImage:photo("photo-1710580889701-9fa8f2cd5927") },
 { key:"skin-oily",label:"Жирна",kind:"skin",description:"Баланс і очищення",defaultImage:photo("photo-1761475011451-8ba8cb188699") },
 { key:"skin-combination",label:"Комбінована",kind:"skin",description:"Догляд за різними зонами",defaultImage:photo("photo-1541752857837-f8a0154fd092") },
 { key:"skin-normal",label:"Нормальна",kind:"skin",description:"Щоденна підтримка",defaultImage:photo("photo-1764773963700-d7e0277db2cc") },
 { key:"skin-sensitive",label:"Чутлива",kind:"skin",description:"Делікатний догляд",defaultImage:photo("photo-1730288951113-9cc087c14b83") },
 { key:"skin-mature",label:"Зріла",kind:"skin",description:"Підтримка пружності",defaultImage:photo("photo-1764773963700-d7e0277db2cc") },
 { key:"concern-wrinkles",label:"Зморшки",kind:"concern",description:"Пружність і тонус",defaultImage:"/skin-concerns/01-wrinkles.webp" },
 { key:"concern-pigmentation",label:"Пігментація",kind:"concern",description:"Рівніший тон",defaultImage:"/skin-concerns/02-pigmentation.webp" },
 { key:"concern-redness",label:"Чутливість / почервоніння",kind:"concern",description:"Заспокоєння шкіри",defaultImage:"/skin-concerns/03-redness.webp" },
 { key:"concern-dullness",label:"Тьмяність",kind:"concern",description:"Сяйво шкіри",defaultImage:"/skin-concerns/04-dullness.webp" },
 { key:"concern-acne",label:"Висипання / акне",kind:"concern",description:"Догляд за проблемною шкірою",defaultImage:"/skin-concerns/05-acne.webp" },
 { key:"concern-dehydration",label:"Зневоднення",kind:"concern",description:"Відновлення зволоження",defaultImage:"/skin-concerns/06-dehydration.webp" },
 { key:"concern-pores",label:"Розширені пори",kind:"concern",description:"Текстура і баланс",defaultImage:"/skin-concerns/07-pores.webp" },
 { key:"concern-barrier",label:"Порушений бар’єр",kind:"concern",description:"Комфорт і відновлення",defaultImage:"/skin-concerns/08-barrier.webp" },
];
export const SKIN_CATEGORIES = READY_BASKET_CATEGORIES.filter(x=>x.kind==="skin");
export const CONCERN_CATEGORIES = READY_BASKET_CATEGORIES.filter(x=>x.kind==="concern");
export const CATEGORY_KEYS = new Set(READY_BASKET_CATEGORIES.map(x=>x.key));
export const categoryByKey = (key:string) => READY_BASKET_CATEGORIES.find(x=>x.key===key);
