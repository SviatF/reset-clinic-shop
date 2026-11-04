import ShopListing,{type ShopQuery,type ShopCategory} from "@/components/ShopListing";
export const dynamic="force-dynamic";
export const revalidate=0;
export default async function CatalogPage({searchParams}:{searchParams?:Promise<ShopQuery>}){
 const query=(await searchParams)||{};
 const category=["face","body","hair"].includes(query.category||"")?query.category as ShopCategory:undefined;
 return <ShopListing category={category} subcategory={category?query.subcategory:undefined} query={query} inCatalog/>;
}
