import type {Metadata} from "next";
import ShopListing,{type ShopQuery} from "@/components/ShopListing";
export const metadata:Metadata={title:"Догляд за тілом — RESET Clinic",description:"Професійна косметика для тіла з підбором фахівця RESET Clinic.",alternates:{canonical:"/body"}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams?:Promise<ShopQuery>}){
 return <ShopListing category="body" query={(await searchParams)||{}}/>;
}
