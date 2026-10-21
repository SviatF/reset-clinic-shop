import "server-only";
import type { ProductRecord } from "@/lib/commerce-types";
import { readProducts } from "@/lib/commerce-json";
import { inferredSubcategories } from "@/lib/catalog-taxonomy";
export type StoreProduct = {
  id: string | null; slug: string; name: string; brand: string; sku: string | null;
  category: "face" | "body" | "hair" | "other"; subcategories: string[]; productLine: string;
  price: number; currency: string; stockQuantity: number; trackStock: boolean;
  size: string; imageUrl: string | null; secondaryImageUrl: string | null;
  shortDescription: string; description: string; hoverLabel: string;
  hoverTitle: string; hoverText: string; howToUse: string; keyIngredients: string[];
  inci: string; seoTitle: string; seoDescription: string; featured: boolean; updatedAt: string;
};
function mapRecord(row: ProductRecord): StoreProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    category: row.category,
    subcategories: row.subcategory_slugs?.length ? row.subcategory_slugs : inferredSubcategories(row.name,row.category),
    productLine: row.product_line || "",
    price: Number(row.price || 0),
    currency: row.currency || "UAH",
    stockQuantity: Number(row.stock_quantity || 0),
    trackStock: row.track_stock,
    size: row.size || "",
    imageUrl: row.image_url,
    secondaryImageUrl: row.secondary_image_url,
    shortDescription: row.short_description || row.description || "",
    description: row.description || row.short_description || "",
    hoverLabel: row.hover_label || "ПРИЗНАЧЕННЯ",
    hoverTitle: row.hover_title || row.short_description || "Професійний догляд",
    hoverText: row.hover_text || row.size || row.brand,
    howToUse: row.how_to_use || "",
    keyIngredients: row.key_ingredients || [],
    inci: row.inci || "",
    seoTitle: row.seo_title || row.name,
    seoDescription: row.seo_description || row.description || row.short_description || "",
    featured: row.featured,
    updatedAt: row.updated_at,
  };
}


export async function getAllProductRecords(){return readProducts();}
export type CatalogQuery = {category?:string;subcategory?:string;brand?:string;featured?:boolean;limit?:number;page?:number;search?:string;line?:string;sort?:"default"|"price-asc"|"price-desc"|"name"};
export async function getStoreProductsPage(options:CatalogQuery={}){
  const data=await readProducts();
  const query=(options.search||"").toLocaleLowerCase("uk").trim();
  const filtered=data.filter(row=>row.status==="active")
    .filter(row=>!options.category||row.category===options.category)
    .filter(row=>!options.subcategory||(row.subcategory_slugs?.length ? row.subcategory_slugs : inferredSubcategories(row.name,row.category)).includes(options.subcategory))
    .filter(row=>!options.brand||row.brand.toLocaleLowerCase("uk")===options.brand.toLocaleLowerCase("uk"))
    .filter(row=>!options.line||row.product_line===options.line)
    .filter(row=>options.featured===undefined||row.featured===options.featured)
    .filter(row=>!query||[row.name,row.brand,row.description,row.sku||""].some(v=>v.toLocaleLowerCase("uk").includes(query)));
  if(options.sort==="price-asc")filtered.sort((a,b)=>Number(a.price)-Number(b.price));
  else if(options.sort==="price-desc")filtered.sort((a,b)=>Number(b.price)-Number(a.price));
  else if(options.sort==="name")filtered.sort((a,b)=>a.name.localeCompare(b.name,"uk"));
  else filtered.sort((a,b)=>a.sort_order-b.sort_order||new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  const limit=Math.max(1,Math.min(500,options.limit||50));
  const pages=Math.max(1,Math.ceil(filtered.length/limit));
  const page=Math.max(1,Math.min(pages,Math.trunc(options.page||1)));
  return {items:filtered.slice((page-1)*limit,page*limit).map(mapRecord),total:filtered.length,page,pages};
}
export async function getStoreProducts(options:CatalogQuery={}){return (await getStoreProductsPage(options)).items;}
export async function getStoreProductBySlug(slug:string){
 const row=(await readProducts()).find(item=>item.slug===slug&&item.status==="active");
 return row?mapRecord(row):null;
}
