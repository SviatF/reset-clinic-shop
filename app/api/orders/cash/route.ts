import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { OrderRecord } from "@/lib/commerce-types";
import { appendActivity, mutateOrders, readOrders, newId } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured, jsonStoreWriteAvailable } from "@/lib/json-store";
import { normalizeOrder } from "@/lib/mono";
import { certificateFromSlug } from "@/lib/certificate-products";
import { earnedCartBenefits } from "@/lib/cart-benefits";
import { queueOrderTelegram } from "@/lib/telegram-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CashOrderBody = {
 name?: string; phone?: string; email?: string; delivery?: string; city?: string;
 branch?: string; comment?: string; certificate_recipient_email?: string;
 certificate_message?: string; items?: Array<{slug:string;qty:number}>;
 clientRequestId?: string;
};
const clean = (v:unknown, max=180) => typeof v === "string" ? v.trim().slice(0,max) : "";
const respond = (body:unknown, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const publicOrder = (order:OrderRecord) => ({
 ok:true,orderNumber:order.order_number,
 amount:Number(order.total),currency:order.currency,
 paymentMethod:"cash_on_pickup",paymentStatus:order.payment_status,
});

export async function POST(request:Request) {
 // Cash must not be enabled on preview deployments or without a durable order store.
 if (process.env.SHOP_STAGING === "true") return respond({error:"Оформлення замовлень недоступне в тестовому режимі"},503);
 if (!jsonStoreWriteConfigured() || !(await jsonStoreWriteAvailable()))
  return respond({error:"Сховище замовлень недоступне. Спробуйте пізніше."},503);
 const origin=request.headers.get("origin");
 if (origin && origin!==new URL(request.url).origin) return respond({error:"Invalid origin"},403);
 try {
  const body=await request.json() as CashOrderBody;
  if (body.delivery!=="pickup") return respond({error:"Оплата готівкою доступна лише для самовивозу"},400);
  const id=clean(body.clientRequestId,80);
  if (!/^[a-f0-9-]{36}$/i.test(id)) return respond({error:"Не вдалося підтвердити запит. Оновіть сторінку."},400);
  const name=clean(body.name),phone=clean(body.phone,80),email=clean(body.email,120);
  if (!name || !phone) return respond({error:"Вкажіть ім’я та номер телефону"},400);
  if (!/^\+?[\d\s()\-]{9,22}$/.test(phone)) return respond({error:"Перевірте номер телефону"},400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({error:"Перевірте email покупця"},400);

  // Replay a successful request without creating a duplicate, including after network timeouts.
  const previous=(await readOrders()).find(order=>order.reference===id && order.payment_method==="cash_on_pickup");
  if (previous) {
   if (previous.phone!==phone) return respond({error:"Повторний запит не збігається з попереднім замовленням"},409);
   await queueOrderTelegram(previous,"created");
   return respond(publicOrder(previous));
  }

  const {items,amount}=await normalizeOrder(body.items||[]);
  if (items.some(item=>!Number.isFinite(item.unitAmount)||item.unitAmount<=0) || amount<=0)
   return respond({error:"Неможливо оформити замовлення без ціни"},400);
  const hasCertificate=items.some(item=>Boolean(certificateFromSlug(item.slug)));
  const recipient=clean(body.certificate_recipient_email,120);
  if (recipient && (!hasCertificate||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)))
   return respond({error:"Перевірте email одержувача сертифіката"},400);

  const now=new Date().toISOString();
  const orderCode=randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
  const merchandiseTotal=items.reduce((sum,item)=>sum+(certificateFromSlug(item.slug)?0:item.totalAmount),0)/100;
  const benefits=earnedCartBenefits(merchandiseTotal);
  const record:OrderRecord={
   id:newId("order"),order_number:`RST-${orderCode}`,invoice_id:null,reference:id,
   payment_method:"cash_on_pickup",payment_status:"pending_cash",status:"new",
   customer_name:name,phone,email,delivery_method:"pickup",city:"Львів",
   branch:"RESET Clinic, вул. Кульпарківська, 93/2",
   comment:clean(body.comment,1000),
   certificate_recipient_email:recipient||null,
   certificate_message:clean(body.certificate_message,500)||null,
   tracking_number:null,
   admin_notes: benefits.length?`БОНУСИ ЗАМОВЛЕННЯ (товари без сертифікатів): ${benefits.join("; ")}`:null,
   subtotal:amount/100,shipping:0,total:amount/100,currency:"UAH",
   items:items.map(item=>({
    product_id:item.productId,slug:item.slug,name:item.name,sku:item.sku,
    unit_price:item.unitAmount/100,quantity:item.qty,line_total:item.totalAmount/100
   })),
   mono_payload:null,stock_decremented:false,paid_at:null,created_at:now,updated_at:now
  };

  const orders=await mutateOrders(`Cash on pickup: ${record.order_number}`,current=>{
   if(current.some(order=>order.reference===id&&order.payment_method==="cash_on_pickup")) return current;
   return [record,...current];
  });
  const stored=orders.find(order=>order.reference===id&&order.payment_method==="cash_on_pickup");
  if(!stored)throw new Error("Замовлення не збережене");
  if(stored.id===record.id) {
   await queueOrderTelegram(stored,"created");
   try{
    await appendActivity({
     event_type:"order_created",entity_type:"order",entity_id:stored.id,
     title:`Нове замовлення ${stored.order_number} · готівка при самовивозі`,
     metadata:{total:Number(stored.total),paymentMethod:"cash_on_pickup"}
    });
   }catch(error){console.error("Cash order activity logging failed",error);}
  }
  return respond(publicOrder(stored),201);
 } catch(error) {
  console.error("Cash pickup order creation failed",error);
  const message=error instanceof Error?error.message:"Не вдалося оформити замовлення";
  const clientError=/Кошик|товар|сертифікат|наявності|ціна|недоступний/i.test(message);
  return respond({error:clientError?message:"Не вдалося зберегти замовлення. Спробуйте ще раз."},clientError?400:503);
 }
}
