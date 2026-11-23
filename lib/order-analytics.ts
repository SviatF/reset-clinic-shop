import type { OrderAttribution, OrderRecord } from "@/lib/commerce-types";

const parameters = [
  "utm_source","utm_medium","utm_campaign","utm_content","utm_term",
  "gclid","fbclid","gbraid","wbraid"
] as const;

export function sanitizeOrderAttribution(raw:unknown):OrderAttribution|null {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  const input=raw as Record<string,unknown>;
  const result:OrderAttribution={};
  for(const key of parameters){
    const value=input[key];
    if(typeof value==="string"&&value.length<=250&&value.trim())result[key]=value.trim();
  }
  const client=input.ga4_client_id;
  const session=input.ga4_session_id;
  const measurement=input.ga4_measurement_id;
  const landing=input.landing_page;
  if(typeof client==="string"&&/^\d{5,20}\.\d{5,20}$/.test(client))
    result.ga4_client_id=client;
  if(typeof session==="string"&&/^\d{8,15}$/.test(session))
    result.ga4_session_id=session;
  if(typeof measurement==="string"&&/^G-[A-Z0-9]{6,18}$/.test(measurement))
    result.ga4_measurement_id=measurement;
  if(typeof landing==="string"&&landing.length<=300){
    try{
      const u=new URL(landing);
      if(u.origin==="https://shop.resetclinic.org")result.landing_page=u.origin+u.pathname;
    }catch{}
  }
  return Object.keys(result).length?result:null;
}

export function confirmedPurchase(order:OrderRecord) {
  // Bank data is stored exclusively after verification of the webhook signature.
  // Cash purchases are allowed only after staff explicitly mark cash received.
  const cash=order.payment_method==="cash_on_pickup"&&order.payment_status==="cash_paid";
  const mono=order.payment_method!=="cash_on_pickup"&&order.payment_status==="success"&&Boolean(order.paid_at);
  if(!cash&&!mono)return null;
  const amount=order.mono_payload;
  const finalAmount=mono && typeof amount?.finalAmount==="number" && Number.isFinite(amount.finalAmount) &&
    amount.finalAmount>0 ? amount.finalAmount/100 : Number(order.total);
  if(!Number.isFinite(finalAmount)||finalAmount<=0)return null;
  return {
    transaction_id:order.order_number,
    value:Math.round(finalAmount*100)/100,
    currency:order.currency||"UAH",
    items:order.items.map(item=>({
      item_id:item.sku||item.slug,
      item_name:item.name,
      price:Number(item.unit_price),
      quantity:Number(item.quantity)
    })),
  };
}
