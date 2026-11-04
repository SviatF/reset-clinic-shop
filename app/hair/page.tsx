import type {Metadata} from "next";
import ShopListing,{type ShopQuery} from "@/components/ShopListing";
export const metadata:Metadata={title:"Догляд за волоссям — RESET Clinic",description:"Професійний догляд за волоссям і шкірою голови від RESET Clinic.",alternates:{canonical:"/hair"}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams?:Promise<ShopQuery>}){
 return <ShopListing category="hair" query={(await searchParams)||{}}/>;
}
