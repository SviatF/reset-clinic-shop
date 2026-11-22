import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readOrders } from "@/lib/commerce-json";
import type { OrderRecord } from "@/lib/commerce-types";

/**
 * Telegram notifications are a best-effort side effect of an already saved order.
 * The durable D1 outbox keeps failed or unconfigured deliveries for later retries.
 * Neither an outage nor an invalid Telegram token may interrupt checkout/webhooks.
 */
type Statement = {
  bind(...values: unknown[]): Statement;
  run(): Promise<{ meta?: { changes?: number } }>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
};
type D1 = { prepare(sql: string): Statement };
type OutboxEntry = { notification_key: string; order_id: string; event: string };
const TABLE = "shop_order_telegram_notifications";
const SCHEMA = "CREATE TABLE IF NOT EXISTS " + TABLE + " (" +
  "notification_key TEXT PRIMARY KEY NOT NULL," +
  "order_id TEXT NOT NULL," +
  "event TEXT NOT NULL," +
  "status TEXT NOT NULL DEFAULT 'pending'," +
  "attempts INTEGER NOT NULL DEFAULT 0," +
  "last_error TEXT," +
  "claim_until TEXT," +
  "telegram_message_id INTEGER," +
  "created_at TEXT NOT NULL DEFAULT (datetime('now'))," +
  "sent_at TEXT" +
  ")";
const money = (v: number) => new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 2, minimumFractionDigits: 2
}).format(Number(v) || 0) + " грн";

const html = (value: unknown, max=500) => String(value ?? "").slice(0,max)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
  .replace(/'/g,"&#39;");
const deliveryName: Record<string, string> = {
  pickup: "Самовивіз із RESET Clinic",
  nova: "Нова Пошта",
  courier: "Кур'єрська доставка"
};
const statusName: Record<string,string> = {
  created: "Очікує оплати",
  processing: "Оплата обробляється",
  success: "Оплачено",
  pending_cash: "Готівка при отриманні",
  cash_paid: "Готівку отримано",
  expired: "Рахунок прострочено",
  failure: "Оплату відхилено",
  reversed: "Кошти повернено"
};
const eventName: Record<string,string> = {
  created: "🛍 НОВЕ ЗАМОВЛЕННЯ",
  paid: "✅ ОПЛАТА ПІДТВЕРДЖЕНА",
  cancelled: "⚠️ ЗАМОВЛЕННЯ СКАСОВАНО",
  refunded: "↩️ ПОВЕРНЕННЯ КОШТІВ",
  "status:processing": "📦 ЗАМОВЛЕННЯ В ОБРОБЦІ",
  "status:shipped": "🚚 ЗАМОВЛЕННЯ ВІДПРАВЛЕНО",
  "status:completed": "✅ ЗАМОВЛЕННЯ ВИКОНАНО"
};

function telegramCredentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId || !/^-?\d+$/.test(chatId)) return null;
  const thread = process.env.TELEGRAM_THREAD_ID?.trim();
  return {
    token, chat_id:chatId,
    ...(thread && /^\d+$/.test(thread) ? {message_thread_id: Number(thread)} : {})
  };
}

export function telegramOrdersConfigured() {
  return Boolean(telegramCredentials());
}

function getDb(): D1 | null {
  if (process.env.SHOP_STORAGE_BACKEND !== "cloudflare") return null;
  try {
    return ((getCloudflareContext().env as unknown as {SHOP_DB?:D1}).SHOP_DB) || null;
  } catch {
    return null;
  }
}

function renderOrder(order: OrderRecord, event: string) {
  const paymentMethod = order.payment_method === "cash_on_pickup"
    ? "Готівка при самовивозі" : "Monobank / онлайн";
  const orderStatus = statusName[order.payment_status] || order.payment_status || "Невідомо";
  const list = order.items.slice(0,18).map((item,index)=>
    String(index+1)+". "+html(item.name,140)+"\n"+
    "   "+html(item.quantity)+" шт. × "+html(money(Number(item.unit_price)),50)+
    " = <b>"+html(money(Number(item.line_total)),50)+"</b>"
  );
  if(order.items.length>18)list.push("… та ще "+(order.items.length-18)+" позицій");
  const sections = [
    "<b>"+html(eventName[event] || "🔔 ОНОВЛЕННЯ ЗАМОВЛЕННЯ")+"</b>",
    "RESET CLINIC SHOP",
    "",
    "🧾 <b>"+html(order.order_number,70)+"</b>",
    "💳 <b>"+html(paymentMethod)+"</b>",
    "Статус оплати: <b>"+html(orderStatus)+"</b>",
    "Статус замовлення: "+html(order.status,50),
    "",
    "👤 <b>Клієнт</b>",
    html(order.customer_name,180),
    "📞 "+html(order.phone,80),
    ...(order.email ? ["✉️ "+html(order.email,150)] : []),
    "",
    "🚚 <b>Доставка / отримання</b>",
    html(deliveryName[order.delivery_method] || order.delivery_method),
    ...(order.city ? [html(order.city,140)] : []),
    ...(order.branch ? [html(order.branch,240)] : []),
    "",
    "🧴 <b>Склад замовлення</b>",
    ...list,
    "",
    "💰 <b>РАЗОМ: "+html(money(Number(order.total)),70)+"</b>",
    ...(order.comment ? ["", "💬 <b>Коментар:</b> "+html(order.comment,500)] : []),
    ...(order.certificate_recipient_email ? [
      "🎁 Одержувач сертифіката: "+html(order.certificate_recipient_email,150)
    ] : []),
    ...(order.certificate_message ? ["Побажання: "+html(order.certificate_message,250)] : []),
    "",
    "🔗 <a href=\"https://shop.resetclinic.org/admin/orders\">Відкрити замовлення в адмінпанелі</a>"
  ];
  // Telegram messages have a 4096 character limit after entity parsing.
  const safe: string[] = [];
  let length = 0;
  for (const section of sections) {
    // Never truncate inside an HTML entity/tag; Telegram rejects malformed markup.
    if (length + section.length + 1 > 3900) {
      safe.push("…");
      break;
    }
    safe.push(section);
    length += section.length + 1;
  }
  return safe.join("\n");
}

async function deliver(order: OrderRecord, event: string, config: NonNullable<ReturnType<typeof telegramCredentials>>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(
      "https://api.telegram.org/bot"+config.token+"/sendMessage",
      {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          chat_id:config.chat_id,
          ...(config.message_thread_id ? {message_thread_id:config.message_thread_id} : {}),
          text:renderOrder(order,event),parse_mode:"HTML",
          link_preview_options:{is_disabled:true},
          protect_content:true
        }),
        cache:"no-store",
        signal:controller.signal
      }
    );
    // Never include a Telegram response body or bot token in logs.
    if (!response.ok) throw new Error("TELEGRAM_HTTP_"+response.status);
    const result = await response.json() as {ok?:boolean;result?:{message_id?:number}};
    if (!result.ok) throw new Error("TELEGRAM_REJECTED");
    return result.result?.message_id || null;
  } finally {
    clearTimeout(timer);
  }
}

async function init(db:D1) {
  await db.prepare(SCHEMA).run();
}

/** Run from an authenticated admin action or right after another order is saved. */
export async function retryPendingOrderTelegram(limit=10) {
  const db = getDb();
  if(!db) return {configured:false,attempted:0,sent:0,failed:0};
  await init(db);
  const config = telegramCredentials();
  if(!config) return {configured:false,attempted:0,sent:0,failed:0};
  const pending = await db.prepare(
    "SELECT notification_key,order_id,event FROM "+TABLE+
    " WHERE status IN ('pending','failed') OR (status='sending' AND claim_until < datetime('now'))"+
    " ORDER BY created_at ASC LIMIT ?"
  ).bind(Math.max(1,Math.min(limit,20))).all<OutboxEntry>();
  const byId=new Map((await readOrders()).map(order=>[order.id,order]));
  let attempted=0,sent=0,failed=0;
  for(const entry of pending.results||[]) {
    const lock=await db.prepare(
      "UPDATE "+TABLE+" SET status='sending',attempts=attempts+1,"+
      "claim_until=datetime('now','+2 minutes')"+
      " WHERE notification_key=? AND (status IN ('pending','failed')"+
      " OR (status='sending' AND claim_until < datetime('now')))"
    ).bind(entry.notification_key).run();
    if((lock.meta?.changes||0)!==1)continue;
    attempted++;
    try {
      const order=byId.get(entry.order_id);
      if(!order)throw new Error("ORDER_NOT_FOUND");
      const messageId=await deliver(order,entry.event,config);
      await db.prepare(
        "UPDATE "+TABLE+" SET status='sent',sent_at=datetime('now'),"+
        "claim_until=NULL,last_error=NULL,telegram_message_id=? WHERE notification_key=?"
      ).bind(messageId,entry.notification_key).run();
      sent++;
    }catch(error) {
      failed++;
      const code=error instanceof Error ? error.message : "TELEGRAM_UNKNOWN";
      console.warn("Telegram order alert delivery failed",entry.event,code.replace(/bot\d+:[^\s/]+/g,"bot[redacted]"));
      await db.prepare(
        "UPDATE "+TABLE+" SET status='failed',claim_until=NULL,last_error=? WHERE notification_key=?"
      ).bind(code.slice(0,120),entry.notification_key).run();
    }
  }
  return {configured:true,attempted,sent,failed};
}

/** Enqueue before trying Telegram. Never block checkout or payment reconciliation. */
export async function queueOrderTelegram(order:OrderRecord,event:string) {
  if(process.env.SHOP_STAGING==="true")return;
  try {
    const db=getDb();
    if(!db)return;
    await init(db);
    const key=order.id+":"+event;
    await db.prepare(
      "INSERT OR IGNORE INTO "+TABLE+
      " (notification_key,order_id,event,status) VALUES (?,?,?,'pending')"
    ).bind(key,order.id,event).run();

    if(!telegramOrdersConfigured())return; // Retain in D1 until secrets are configured.
    const task=retryPendingOrderTelegram(10).catch(error=>{
      console.warn("Telegram retry failed",error instanceof Error?error.name:"UNKNOWN");
    });
    try {
      getCloudflareContext().ctx.waitUntil(task);
    }catch {
      await task;
    }
  }catch(error) {
    console.warn("Telegram order notification queue error",
      error instanceof Error ? error.name : "UNKNOWN");
  }
}

/** Admin-only visibility. No personally identifying information returned. */
export async function telegramOrderQueueStatus() {
  const db=getDb();
  if(!db)return {configured:false,pending:null,sent:null,failed:null};
  await init(db);
  const result=await db.prepare(
    "SELECT "+
    "SUM(CASE WHEN status IN ('pending','sending') THEN 1 ELSE 0 END) AS pending,"+
    "SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,"+
    "SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) AS sent FROM "+TABLE
  ).first<{pending:number|null;failed:number|null;sent:number|null}>();
  return {
    configured:telegramOrdersConfigured(),
    pending:Number(result?.pending||0),
    failed:Number(result?.failed||0),
    sent:Number(result?.sent||0)
  };
}
