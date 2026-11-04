import type {Metadata} from "next";
import ShopListing,{type ShopQuery} from "@/components/ShopListing";
export const metadata:Metadata={title:"Догляд за обличчям — RESET Clinic",description:"Професійна косметика для обличчя з підбором косметолога RESET Clinic.",alternates:{canonical:"/face"}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams?:Promise<ShopQuery>}){
 return <ShopListing category="face" query={(await searchParams)||{}}/>;
}
