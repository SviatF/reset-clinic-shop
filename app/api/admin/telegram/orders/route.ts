import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { retryPendingOrderTelegram, telegramOrderQueueStatus } from "@/lib/telegram-orders";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET() {
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    return NextResponse.json(await telegramOrderQueueStatus(),{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Неможливо перевірити чергу Telegram"},{status:503});
  }
}

export async function POST() {
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const result=await retryPendingOrderTelegram(20);
    const status=await telegramOrderQueueStatus();
    return NextResponse.json({...result,queue:status},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Не вдалося повторити відправку Telegram"},{status:503});
  }
}
