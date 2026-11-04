import type {Metadata} from "next";
import {notFound} from "next/navigation";
import ShopListing,{type ShopCategory,type ShopQuery} from "@/components/ShopListing";
import {readCategories} from "@/lib/catalog-categories";
export const dynamic="force-dynamic";
type Props={params:Promise<{category:string;subcategory:string}>;searchParams?:Promise<ShopQuery>};
async function findCategory(category:string,subcategory:string){
 if(!["face","body","hair"].includes(category))return null;
 return (await readCategories()).find(row=>row.parent_slug===category&&row.slug===subcategory&&row.status==="active")||null;
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {category,subcategory}=await params;
 const found=await findCategory(category,subcategory);
 if(!found)return {title:"Категорію не знайдено",robots:{index:false}};
 return {title:found.seo_title||found.name+" — RESET Clinic",description:found.seo_description||found.description||"Професійна косметика RESET Clinic",alternates:{canonical:"/"+category+"/"+subcategory}};
}
export default async function SubcategoryPage({params,searchParams}:Props){
 const {category,subcategory}=await params;
 if(!(await findCategory(category,subcategory)))notFound();
 return <ShopListing category={category as ShopCategory} subcategory={subcategory} query={(await searchParams)||{}}/>;
}
