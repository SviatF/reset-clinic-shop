import { NextRequest, NextResponse } from "next/server";
import { readOrders } from "@/lib/commerce-json";
import { confirmedPurchase } from "@/lib/order-analytics";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * Read-only receipt information. A successful Mono API status alone is NOT
 * sufficient: the signed webhook must have been persisted in the order store.
 * The private invoiceId/reference pair is kept only in the initiating browser.
 */
export async function GET(request:NextRequest) {
  const params=request.nextUrl.searchParams;
  const invoiceId=(params.get("invoiceId")||"").trim();
  const reference=(params.get("reference")||"").trim();
  if(!/^[a-zA-Z0-9_-]{6,100}$/.test(invoiceId) ||
     !/^[a-zA-Z0-9_-]{16,80}$/.test(reference)){
    return NextResponse.json({error:"Invalid order lookup"},{status:400});
  }
  try {
    const orders=await readOrders();
    const order=orders.find(x=>x.invoice_id===invoiceId && x.reference===reference &&
      x.payment_method!=="cash_on_pickup");
    if(!order)return NextResponse.json({error:"Order not found"},{status:404});
    const ecommerce=confirmedPurchase(order);
    return NextResponse.json(ecommerce
      ? {ready:true,ecommerce,attribution:order.attribution||null}
      : {ready:false},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({error:"Order verification temporarily unavailable"},{status:503});
  }
}
