import CatalogFilterNavigation from "@/components/CatalogFilterNavigation";
import CatalogFilterPanel from "@/components/CatalogFilterPanel";
import Link from "next/link";
import ShopProductCard from "@/components/ShopProductCard";
import {readCategories} from "@/lib/catalog-categories";
import {productSubcategories} from "@/lib/catalog-taxonomy";
import {getAllProductRecords,getStoreProductsPage,type CatalogQuery} from "@/lib/store-products";

export type ShopQuery={page?:string;category?:string;subcategory?:string;brand?:string;sort?:string;q?:string};
export type ShopCategory="face"|"body"|"hair";
const groups:{slug:ShopCategory;label:string;desc:string}[]=[
 {slug:"face",label:"Обличчя",desc:"Очищення, креми, сироватки та SPF — потрібні засоби без зайвих кроків."},
 {slug:"body",label:"Тіло",desc:"Очищення, зволоження та спеціальний догляд."},
 {slug:"hair",label:"Волосся",desc:"Шампуні, кондиціонери, маски та стайлінг."}
];
const sortOptions=["default","price-asc","price-desc","name"];
function makeUrl(path:string,params:Record<string,string|undefined>){
 const q=new URLSearchParams();
 for(const [key,value] of Object.entries(params))if(value)q.set(key,value);
 return path+(q.size?"?"+q.toString():"");
}
export default async function ShopListing({category,subcategory,query={},inCatalog=false}:{
 category?:ShopCategory;subcategory?:string;query?:ShopQuery;inCatalog?:boolean
}){
 const sort=sortOptions.includes(query.sort||"")?query.sort as CatalogQuery["sort"]:"default";
 const page=Math.max(1,Math.floor(Number(query.page)||1));
 const [taxonomy,records]=await Promise.all([readCategories(),getAllProductRecords()]);
 const result=await getStoreProductsPage({category,subcategory,page,limit:24,sort,brand:query.brand,search:query.q},records);
 const active=records.filter(row=>row.status==="active");
 const scoped=active.filter(row=>!category||row.category===category);
 const allBrands=[...new Set(active.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,"uk"));
 const children=category?taxonomy.filter(c=>c.parent_slug===category&&c.status==="active").sort((a,b)=>a.sort_order-b.sort_order):[];
 const currentChild=children.find(c=>c.slug===subcategory);
 const group=groups.find(c=>c.slug===category);
 const heading=query.brand
   ? (group ? `${group.label} · ${query.brand}` : `Товари бренду ${query.brand}`)
   : currentChild?.name||group?.label||"Каталог косметики";
 const root=inCatalog?"/catalog":category?"/"+category:"/catalog";
 const action=inCatalog?"/catalog":subcategory?"/"+category+"/"+subcategory:root;
 const pagination=(n:number)=>makeUrl(action,{...(inCatalog?{category,subcategory}:{}),q:query.q,brand:query.brand,sort,page:String(n)});
 const allCount=(c:ShopCategory)=>active.filter(x=>x.category===c).length;
 const navCategories=groups.map(item=>({slug:item.slug,label:item.label,description:item.desc,count:allCount(item.slug)}));
 const navSubcategories=children.map(child=>({slug:child.slug,name:child.name,count:scoped.filter(row=>productSubcategories(row).includes(child.slug)).length}));
 return <section className="rs-shop" id="products"><div className="shell rs-shop-inner">
  <div className="rs-shop-head">
   <div><span>RESET CLINIC / КАТАЛОГ</span><h1>{heading}</h1><p>{group?.desc||"Професійні засоби для обличчя, тіла й волосся."}</p></div>
   <Link href="/consultation">Допомога з вибором →</Link>
  </div>
  <CatalogFilterNavigation
    initialCategory={category}
    initialSubcategory={subcategory}
    categories={navCategories}
    subcategories={navSubcategories}
    brands={allBrands}
  />
  <div className="rs-tools">
   <p><strong>{result.total}</strong> {result.total===1?"товар":"товарів"}</p>
   <CatalogFilterPanel initialCategory={category} initialSubcategory={subcategory} brands={allBrands} />
  </div>
  <div className="rs-grid">{result.items.map(item=><ShopProductCard key={item.slug} item={item}/>)}</div>
  {result.total===0&&<div className="rs-empty"><p>За вибраними параметрами товарів немає.</p><Link href={makeUrl("/catalog",{category})}>Показати всі засоби →</Link></div>}
  {result.pages>1&&<nav className="rs-pagination" aria-label="Сторінки каталогу">
   {result.page>1&&<Link href={pagination(result.page-1)}>← Назад</Link>}
   <span>{result.page} / {result.pages}</span>
   {result.page<result.pages&&<Link href={pagination(result.page+1)}>Далі →</Link>}
  </nav>}
 </div></section>;
}
