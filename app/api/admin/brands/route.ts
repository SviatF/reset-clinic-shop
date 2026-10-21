import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {readBrands,mutateBrands} from "@/lib/brands-store";
import {readProducts} from "@/lib/commerce-json";
import {jsonStoreWriteConfigured} from "@/lib/json-store";
import {slugifyUkr} from "@/lib/slugify";
import type {StoreBrand} from "@/lib/catalog-brands";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function error(e:unknown){return NextResponse.json({error:e instanceof Error?e.message:"Помилка брендів"},{status:400});}
function clean(value:unknown,size:number){return typeof value==="string"?value.trim().slice(0,size):"";}
function normalize(body:any):StoreBrand{
 const name=clean(body.name,120);if(!name)throw new Error("Назва бренду обов'язкова");
 const slug=slugifyUkr(clean(body.slug,120)||name);
 if(!slug)throw new Error("Недійсний slug");
 const lines=Array.isArray(body.lines)?[...new Set(body.lines.map((v:unknown)=>clean(v,100)).filter(Boolean))] as string[]:[];
 return {id:clean(body.id,120)||slug,slug,name,status:body.status==="hidden"?"hidden":"active",sort_order:Math.trunc(Number(body.sort_order)||0),lines};
}
export async function GET(){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{return NextResponse.json({brands:await readBrands(),writable:jsonStoreWriteConfigured()});}catch(e){return error(e)}
}
export async function POST(req:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!jsonStoreWriteConfigured())return NextResponse.json({error:"Немає сховища для запису"},{status:503});
 try{
  const item=normalize(await req.json());
  const existing=await readBrands();
  const old=existing.find(b=>b.id===item.id);
  if(old&&(old.slug!==item.slug||old.name!==item.name))throw new Error("Не можна змінити ідентифікатор або назву бренду з прив'язаними товарами. Створіть новий бренд і перенесіть товари.");
  const next=await mutateBrands("Admin: upsert brand "+item.id,rows=>{
   if(rows.some(b=>b.id!==item.id&&(b.slug===item.slug||b.name.toLowerCase()===item.name.toLowerCase())))throw new Error("Бренд уже існує");
   return rows.some(b=>b.id===item.id)?rows.map(b=>b.id===item.id?item:b):[...rows,item];
  });
  return NextResponse.json({brands:next,brand:item});
 }catch(e){return error(e)}
}
export async function DELETE(req:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!jsonStoreWriteConfigured())return NextResponse.json({error:"Немає сховища для запису"},{status:503});
 try{
  const body=await req.json(),brands=await readBrands();
  const brand=brands.find(b=>b.id===body.id);if(!brand)throw new Error("Бренд не знайдено");
  if((await readProducts()).some(p=>p.brand===brand.name))throw new Error("Бренд використовується товарами. Спочатку перенесіть товари.");
  const next=await mutateBrands("Admin: delete brand "+brand.id,rows=>rows.filter(b=>b.id!==brand.id));
  return NextResponse.json({brands:next});
 }catch(e){return error(e)}
}
