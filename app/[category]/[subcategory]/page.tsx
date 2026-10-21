import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import PremiumProductCard from "@/components/PremiumProductCard";
import {readCategories} from "@/lib/catalog-categories";
import {getStoreProductsPage} from "@/lib/store-products";
export const dynamic="force-dynamic";
type Props={params:Promise<{category:string;subcategory:string}>;searchParams?:Promise<{page?:string}>};
async function getCategory(category:string,subcategory:string){
 if(!["face","body","hair"].includes(category))return null;
 return (await readCategories()).find(row=>row.parent_slug===category&&row.slug===subcategory&&row.status==="active")||null;
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {category,subcategory}=await params;
 const found=await getCategory(category,subcategory);
 if(!found)return {title:"Категорію не знайдено",robots:{index:false}};
 return {title:found.seo_title||found.name+" — RESET Clinic",description:found.seo_description||found.description||"Професійна косметика RESET Clinic",alternates:{canonical:`/${category}/${subcategory}`}};
}
export default async function SubcategoryPage({params,searchParams}:Props){
 const {category,subcategory}=await params;
 const found=await getCategory(category,subcategory);
 if(!found)notFound();
 const page=Math.max(1,Math.floor(Number((await searchParams)?.page)||1));
 const result=await getStoreProductsPage({category,subcategory,limit:24,page});
 return <section className="catalog-page"><div className="shell">
 <div className="catalog-head"><span>RESET CLINIC SHOP</span><h1>{found.name}</h1><p>{found.description||"Професійний догляд, підібраний для вас."}</p><Link href={`/${category}`}>← Усі товари категорії</Link></div>
 <p style={{marginBottom:24}}>Знайдено: {result.total}</p>
 <div className="category-product-grid catalog-premium-grid">{result.items.map((item,index)=><PremiumProductCard key={item.slug} index={(result.page-1)*24+index+1} productData={item}/>)}</div>
 {result.total===0&&<p>У цій підкатегорії поки немає товарів.</p>}
 {result.pages>1&&<nav aria-label="Сторінки" style={{display:"flex",justifyContent:"center",gap:16,margin:"40px 0"}}>
  {result.page>1&&<Link href={`/${category}/${subcategory}?page=${result.page-1}`}>← Попередня</Link>}
  <span>{result.page} / {result.pages}</span>
  {result.page<result.pages&&<Link href={`/${category}/${subcategory}?page=${result.page+1}`}>Наступна →</Link>}
 </nav>}
 </div></section>;
}
