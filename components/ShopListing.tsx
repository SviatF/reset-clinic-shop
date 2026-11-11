import ArrowUpRight from "@/components/ArrowUpRight";
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
 const [taxonomy,records,result]=await Promise.all([
  readCategories(),getAllProductRecords(),
  getStoreProductsPage({category,subcategory,page,limit:24,sort,brand:query.brand,search:query.q})
 ]);
 const active=records.filter(row=>row.status==="active");
 const scoped=active.filter(row=>!category||row.category===category);
 const brands=[...new Set(scoped.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,"uk"));
 const allBrands=[...new Set(active.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,"uk"));
 const children=category?taxonomy.filter(c=>c.parent_slug===category&&c.status==="active").sort((a,b)=>a.sort_order-b.sort_order):[];
 const currentChild=children.find(c=>c.slug===subcategory);
 const group=groups.find(c=>c.slug===category);
 const heading=query.brand
   ? (group ? `${group.label} · ${query.brand}` : `Товари бренду ${query.brand}`)
   : currentChild?.name||group?.label||"Каталог косметики";
 const root=inCatalog?"/catalog":category?"/"+category:"/catalog";
 const action=inCatalog?"/catalog":subcategory?"/"+category+"/"+subcategory:root;
 const mainHref=(c?:ShopCategory)=>inCatalog?makeUrl("/catalog",{category:c,brand:query.brand}):c?"/"+c:"/catalog";
 const subHref=(sub?:string)=>inCatalog?makeUrl("/catalog",{category,subcategory:sub,brand:query.brand}):sub?"/"+category+"/"+sub:root;
 const pagination=(n:number)=>makeUrl(action,{...(inCatalog?{category,subcategory}:{}),q:query.q,brand:query.brand,sort,page:String(n)});
 const hasFilters=Boolean(query.q||query.brand||(sort&&sort!=="default"));
 const allCount=(c:ShopCategory)=>active.filter(x=>x.category===c).length;
 return <section className="rs-shop" id="products"><div className="shell rs-shop-inner">
  <div className="rs-shop-head">
   <div><span>RESET CLINIC / КАТАЛОГ</span><h1>{heading}</h1><p>{group?.desc||"Професійні засоби для обличчя, тіла й волосся."}</p></div>
   <Link href="/consultation">Допомога з вибором →</Link>
  </div>
  <nav className="rs-mainnav" aria-label="Категорії">
   <Link href={mainHref()} aria-current={!category?"page":undefined}>Усі товари</Link>
   {groups.map(c=><Link key={c.slug} href={mainHref(c.slug)} aria-current={category===c.slug?"page":undefined}>
     {c.label} <small>{allCount(c.slug)}</small></Link>)}
  </nav>
  {category&&children.length>0&&<nav className="rs-subnav" aria-label="Підкатегорії">
   <Link href={subHref()} aria-current={!subcategory?"page":undefined}><span>Усі засоби</span><small>{scoped.length}</small></Link>
   {children.map(child=><Link key={child.id} href={subHref(child.slug)} aria-current={subcategory===child.slug?"page":undefined}>
    <span>{child.name}</span><small>{scoped.filter(row=>productSubcategories(row).includes(child.slug)).length}</small></Link>)}
  </nav>}
  {!category&&<nav className="rs-featured" aria-label="Обрати напрям">
   {groups.map(c=><Link key={c.slug} href={mainHref(c.slug)}><strong>{c.label}</strong><small>{allCount(c.slug)} товарів</small><b aria-hidden="true"><ArrowUpRight /></b></Link>)}
  </nav>}
  <nav className="rs-brand-nav" id="brands" aria-label="Каталог за брендом">
   <span className="rs-brand-nav-label">БРЕНДИ</span>
   <Link href="/catalog" aria-current={!query.brand?"page":undefined}>Усі бренди</Link>
   {allBrands.map(brand=><Link key={brand} href={makeUrl("/catalog",{brand})} aria-current={query.brand?.toLocaleLowerCase("uk")===brand.toLocaleLowerCase("uk")?"page":undefined}>{brand} <ArrowUpRight /></Link>)}
  </nav>
  <div className="rs-tools">
   <p><strong>{result.total}</strong> {result.total===1?"товар":"товарів"}</p>
   <details className="rs-filters">
    <summary>☷ Фільтр і сортування <span aria-hidden="true">⌄</span></summary>
    <form action={action} method="get" className="rs-filter-fields">
     {inCatalog&&category&&<input type="hidden" name="category" value={category}/>}
     {inCatalog&&subcategory&&<input type="hidden" name="subcategory" value={subcategory}/>}
     <label>Пошук<input type="search" name="q" defaultValue={query.q||""} placeholder="Назва або артикул"/></label>
     <label>Бренд<select name="brand" defaultValue={query.brand||""}>
      <option value="">Усі бренди</option>{brands.map(b=><option value={b} key={b}>{b}</option>)}
     </select></label>
     <label>Сортувати<select name="sort" defaultValue={sort}>
      <option value="default">Рекомендовані</option><option value="price-asc">Спочатку дешевші</option>
      <option value="price-desc">Спочатку дорожчі</option><option value="name">За назвою</option>
     </select></label>
     <button type="submit">Показати товари →</button>
     {hasFilters&&<Link href={inCatalog?makeUrl("/catalog",{category}):action}>Скинути</Link>}
    </form>
   </details>
  </div>
  <div className="rs-grid">{result.items.map(item=><ShopProductCard key={item.slug} item={item}/>)}</div>
  {result.total===0&&<div className="rs-empty"><p>За вибраними параметрами товарів немає.</p><Link href={subHref()}>Показати всі засоби →</Link></div>}
  {result.pages>1&&<nav className="rs-pagination" aria-label="Сторінки каталогу">
   {result.page>1&&<Link href={pagination(result.page-1)}>← Назад</Link>}
   <span>{result.page} / {result.pages}</span>
   {result.page<result.pages&&<Link href={pagination(result.page+1)}>Далі →</Link>}
  </nav>}
 </div></section>;
}
