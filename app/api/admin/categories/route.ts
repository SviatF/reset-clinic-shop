import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readCategories,mutateCategories } from "@/lib/catalog-categories";
import { readProducts } from "@/lib/commerce-json";
import { jsonStoreWriteConfigured } from "@/lib/json-store";
import { inferredSubcategories } from "@/lib/catalog-taxonomy";
import type { StoreCategory } from "@/lib/catalog-taxonomy";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function responseError(error:unknown){return NextResponse.json({error:error instanceof Error?error.message:"Помилка категорій"},{status:400});}
function cleaned(input:any):StoreCategory{
 const slug=String(input.slug||"").trim().toLowerCase();
 const parent=input.parent_slug?String(input.parent_slug):null;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Slug має містити латинські літери, цифри та дефіс");
 const name=String(input.name||"").trim().slice(0,120);
 if(!name)throw new Error("Вкажіть назву");
 if(!parent||!["hair","face","body"].includes(parent))throw new Error("Підкатегорія повинна належати до категорії Волосся, Обличчя або Тіло");
 return {id:String(input.id||parent+"-"+slug),slug,name,parent_slug:parent,sort_order:Number(input.sort_order)||0,status:input.status==="hidden"?"hidden":"active",description:String(input.description||"").slice(0,3000),seo_title:String(input.seo_title||"").slice(0,180),seo_description:String(input.seo_description||"").slice(0,320)};
}
export async function GET(){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{return NextResponse.json({categories:await readCategories(),writable:jsonStoreWriteConfigured()});}catch(e){return responseError(e);}
}
export async function POST(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!jsonStoreWriteConfigured())return NextResponse.json({error:"Не налаштовано сховище для запису"},{status:503});
 try{
  const data=await request.json(),category=cleaned(data);
  if(data.id && ["hair","face","body"].includes(data.id))throw new Error("Основні категорії не можна редагувати тут");
  const next=await mutateCategories("Admin: upsert subcategory "+category.id,rows=>{
   if(rows.some(row=>row.id!==category.id&&row.slug===category.slug&&row.parent_slug===category.parent_slug))throw new Error("У цій категорії такий slug уже існує");
   const previous=rows.find(row=>row.id===category.id);
   if(previous&&previous.parent_slug!==category.parent_slug)throw new Error("Переміщення підкатегорії між розділами потребує окремої міграції");
   if(previous&&previous.slug!==category.slug)throw new Error("Slug підкатегорії не можна змінювати без перенесення зв'язків товарів та редиректів");
   return previous?rows.map(row=>row.id===category.id?category:row):[...rows,category];
  });
  return NextResponse.json({category,categories:next});
 }catch(e){return responseError(e);}
}
export async function DELETE(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!jsonStoreWriteConfigured())return NextResponse.json({error:"Не налаштовано сховище"},{status:503});
 try{
  const {id}=await request.json();
  const rows=await readCategories();
  const candidate=rows.find(row=>row.id===id);
  if(!candidate||!candidate.parent_slug)throw new Error("Підкатегорію не знайдено або це основна категорія");
  const used=(await readProducts()).some(row=>row.category===candidate.parent_slug && (row.subcategory_slugs?.length?row.subcategory_slugs:inferredSubcategories(row.name,row.category)).includes(candidate.slug));
  if(used)throw new Error("До цієї підкатегорії прив'язані товари. Спочатку перепризначте їх.");
  const categories=await mutateCategories("Admin: delete subcategory "+id,current=>current.filter(row=>row.id!==id));
  return NextResponse.json({ok:true,categories});
 }catch(e){return responseError(e);}
}
