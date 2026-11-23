/**
 * Browser-only first/last touch attribution.
 * No personal details or bank-card data are collected here.
 */
import type { OrderAttribution } from "@/lib/commerce-types";

const STORE_KEY = "reset-shop-attribution-v1";
const KEYS = [
  "utm_source","utm_medium","utm_campaign","utm_content","utm_term",
  "gclid","fbclid","gbraid","wbraid"
] as const;

function readCookie(name:string) {
  if(typeof document === "undefined")return "";
  const part=document.cookie.split("; ").find(x=>x.startsWith(name+"="));
  try{return part?decodeURIComponent(part.slice(name.length+1)):"";}catch{return "";}
}
function sessionFromCookie(cookie:string) {
  return cookie.match(/^GS2\.\d+\.s(\d{8,15})(?:\$|$)/)?.[1]
    || cookie.match(/^GS1\.\d+\.(\d{8,15})(?:\.|$)/)?.[1] || "";
}
function clientFromCookie(cookie:string) {
  const parts=cookie.split(".");
  const id=parts.slice(-2).join(".");
  return /^\d{5,20}\.\d{5,20}$/.test(id)?id:"";
}
function measurementId() {
  // This ID selects the stream's cookie only. GTM sends the GA4 events.
  return process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "G-CPJEJ15RRG";
}
function readGaIds() {
  const client_id=clientFromCookie(readCookie("_ga"));
  const configured=measurementId();
  const cookies=typeof document==="undefined"?[]:document.cookie.split(";");
  const available=cookies.map(part=>part.trim().split("=")[0]).filter(name=>/^_ga_[A-Z0-9]+$/.test(name));
  // Never attribute the wrong GA4 stream if more than one is installed.
  const chosen=configured?("_ga_"+configured.replace(/^G-/,"")):available.length===1?available[0]:null;
  const session_id=chosen?sessionFromCookie(readCookie(chosen)):"";
  return {
    ...(client_id?{ga4_client_id:client_id}:{}),
    ...(session_id?{ga4_session_id:session_id}:{}),
    ...(configured?{ga4_measurement_id:configured}:{})
  };
}
type Stored={first:Partial<OrderAttribution>;last:Partial<OrderAttribution>};
function safeStored():Stored {
  if(typeof window==="undefined")return {first:{},last:{}};
  try{
    const value=JSON.parse(localStorage.getItem(STORE_KEY)||"{}") as Stored;
    return {first:value?.first||{},last:value?.last||{}};
  }catch{return {first:{},last:{}};}
}
export function captureShopAttribution() {
  if(typeof window==="undefined")return;
  const params=new URLSearchParams(window.location.search);
  const values:Partial<OrderAttribution>={};
  for(const key of KEYS){
    const value=params.get(key);
    if(value&&value.length<400) values[key]=value.slice(0,200);
  }
  const data=safeStored();
  const first={...data.first};
  if(!first.landing_page)first.landing_page=window.location.origin+window.location.pathname;
  // Preserve first acquisition of each parameter; use last touch for checkout.
  for(const key of KEYS){
    if(values[key] && !first[key])first[key]=values[key];
  }
  const next:Stored={first,last:{...data.last,...values}};
  try{localStorage.setItem(STORE_KEY,JSON.stringify(next));}catch{}
}
export function getCheckoutTracking():OrderAttribution {
  captureShopAttribution();
  const saved=safeStored();
  return {...saved.first,...saved.last,...readGaIds()};
}
export function pushEcommerceEvent(eventName:string,ecommerce:Record<string,unknown>){
  if(typeof window==="undefined")return;
  const w=window as typeof window & {dataLayer?:Record<string,unknown>[]};
  w.dataLayer=w.dataLayer||[];
  w.dataLayer.push({ecommerce:null});
  w.dataLayer.push({event:eventName,ecommerce});
}

/** GA4 ecommerce currency amounts are UAH major units; no personal data. */
export type TrackedCartItem={slug:string;name:string;price:number;qty:number};
const roundUah=(n:number)=>Math.round(n*100)/100;
export function cartEcommercePayload(items:readonly TrackedCartItem[]) {
  const valid=items.filter(item=>Boolean(item.slug&&item.name)&&Number.isFinite(item.price)&&item.price>0&&Number.isFinite(item.qty)&&item.qty>0);
  return {
    currency:"UAH",
    value:roundUah(valid.reduce((sum,item)=>sum+item.price*item.qty,0)),
    items:valid.map(item=>({item_id:item.slug,item_name:item.name,price:roundUah(item.price),quantity:item.qty}))
  };
}
export function itemDeltaEcommercePayload(item:Pick<TrackedCartItem,"slug"|"name"|"price">,quantity:number) {
  return {currency:"UAH",value:roundUah(item.price*quantity),
    items:[{item_id:item.slug,item_name:item.name,price:roundUah(item.price),quantity}]
  };
}
