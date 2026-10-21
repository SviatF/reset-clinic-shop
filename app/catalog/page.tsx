import Link from "next/link";
import PremiumProductCard from "@/components/PremiumProductCard";
import { getStoreProductsPage, getAllProductRecords } from "@/lib/store-products";
export const dynamic="force-dynamic";
export const revalidate=0;
type Search={page?:string;category?:string;subcategory?:string;brand?:string;line?:string;sort?:string;q?:string};
function href(query:Search,overrides:Search={}) {
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries({...query,...overrides})){if(value)params.set(key,value);}
 return "/catalog"+(params.size?"?"+params.toString():"");
}
export default async function CatalogPage({searchParams}:{searchParams?:Promise<Search>}){
 const params=(await searchParams)||{};
 const category=["face","body","hair"].includes(params.category||"")?params.category:undefined;
 const page=Math.max(1,Math.floor(Number(params.page)||1));
 const sort=["default","price-asc","price-desc","name"].includes(params.sort||"")?params.sort as "default"|"price-asc"|"price-desc"|"name":"default";
 const result=await getStoreProductsPage({category,subcategory:params.subcategory,brand:params.brand,line:params.line,search:params.q,sort,page,limit:24});
 const active=(await getAllProductRecords()).filter(row=>row.status==="active");
 const brandNames=[...new Set(active.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,"uk"));
 const lineNames=[...new Set(active.filter(row=>!params.brand||row.brand===params.brand).map(row=>row.product_line).filter((v):v is string=>Boolean(v)))].sort();
 const categories=[{slug:"",name:"УСІ"},{slug:"face",name:"ОБЛИЧЧЯ"},{slug:"body",name:"ТІЛО"},{slug:"hair",name:"ВОЛОССЯ"}];
 return <section className="catalog-page"><div className="shell">
  <div className="catalog-head"><span>RESET CLINIC SHOP</span><h1>Каталог</h1><p>Професійні засоби для обличчя, тіла та волосся.</p></div>
  <div className="catalog-filters">{categories.map(item=><Link key={item.slug} href={href(params,{category:item.slug,subcategory:"",page:""})} className={(category||"")===item.slug?"selected":""}>{item.name}</Link>)}</div>
  <form method="get" action="/catalog" style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",marginBottom:30}}>
   {category&&<input type="hidden" name="category" value={category}/>}
   {params.subcategory&&<input type="hidden" name="subcategory" value={params.subcategory}/>}
   <label style={{display:"grid",gap:6,flex:"2 1 200px"}}><span>Пошук</span><input name="q" defaultValue={params.q||""} placeholder="Назва, бренд, SKU" style={{padding:12,border:"1px solid #ddd",width:"100%"}}/></label>
   <label style={{display:"grid",gap:6,flex:"1 1 150px"}}><span>Бренд</span><select name="brand" defaultValue={params.brand||""} style={{padding:12,border:"1px solid #ddd",width:"100%"}}><option value="">Усі бренди</option>{brandNames.map(b=><option key={b} value={b}>{b}</option>)}</select></label>
   <label style={{display:"grid",gap:6,flex:"1 1 150px"}}><span>Лінійка</span><select name="line" defaultValue={params.line||""} style={{padding:12,border:"1px solid #ddd",width:"100%"}}><option value="">Усі лінійки</option>{lineNames.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
   <label style={{display:"grid",gap:6,flex:"1 1 150px"}}><span>Сортування</span><select name="sort" defaultValue={sort} style={{padding:12,border:"1px solid #ddd",width:"100%"}}><option value="default">Рекомендовані</option><option value="price-asc">Дешевші спочатку</option><option value="price-desc">Дорожчі спочатку</option><option value="name">За назвою</option></select></label>
   <button className="black-button" type="submit">Застосувати</button>
  </form>
  <p style={{marginBottom:20}}>Знайдено: {result.total}</p>
  <div className="category-product-grid catalog-premium-grid">{result.items.map((item,index)=><PremiumProductCard key={item.slug} index={(result.page-1)*24+index+1} productData={item}/>)}</div>
  {result.total===0&&<p>За обраними фільтрами товарів немає. Спробуйте змінити параметри.</p>}
  {result.pages>1&&<nav aria-label="Сторінки каталогу" style={{display:"flex",gap:12,margin:"32px 0",alignItems:"center",justifyContent:"center"}}>
   {result.page>1&&<Link href={href(params,{page:String(result.page-1)})}>← Попередня</Link>}
   <span>{result.page} / {result.pages}</span>
   {result.page<result.pages&&<Link href={href(params,{page:String(result.page+1)})}>Наступна →</Link>}
  </nav>}
 </div></section>;
}
