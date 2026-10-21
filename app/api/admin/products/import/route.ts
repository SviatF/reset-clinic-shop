import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {mutateProducts,newId,readProducts} from "@/lib/commerce-json";
import {jsonStoreWriteConfigured} from "@/lib/json-store";
import type {ProductRecord} from "@/lib/commerce-types";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type ImportRow={slug?:string;name?:string;brand?:string;category?:string;subcategory_slugs?:unknown;product_line?:string;price?:unknown;size?:string;short_description?:string;description?:string;image_url?:string};
export async function POST(request:Request){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!jsonStoreWriteConfigured())return NextResponse.json({error:"Немає доступного сховища для запису"},{status:503});
 try{
  const body=await request.json();
  if(!Array.isArray(body.products)||body.products.length===0||body.products.length>500)throw new Error("Передайте масив від 1 до 500 товарів");
  const input=body.products as ImportRow[];
  const seen=new Set<string>();
  const sanitized=input.map((row,i)=>{
   const slug=String(row.slug||"").trim().toLowerCase();
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||seen.has(slug))throw new Error(`Некоректний або повторний slug у рядку ${i+1}`);
   seen.add(slug);
   if(!String(row.name||"").trim()||!["face","body","hair","other"].includes(String(row.category||"")))throw new Error(`Некоректна назва або категорія у рядку ${i+1}`);
   const price=Number(row.price);
   if(!Number.isFinite(price)||price<=0)throw new Error(`Некоректна ціна у рядку ${i+1}`);
   return {...row,slug,name:String(row.name).trim().slice(0,180),category:row.category as ProductRecord["category"],price};
  });
  const current=await readProducts();
  const existing=new Set(current.map(p=>p.slug));
  const duplicates=sanitized.filter(p=>existing.has(p.slug)).map(p=>p.slug);
  if(body.preview!==false)return NextResponse.json({preview:true,total:sanitized.length,new_count:sanitized.length-duplicates.length,duplicates,warnings:duplicates.length?[ `Пропущено наявні slugs: ${duplicates.join(", ")}`]:[]});
  const created=await mutateProducts("Admin: bulk import product drafts",rows=>{
   const existingSlugs=new Set(rows.map(x=>x.slug));
   const now=new Date().toISOString();
   const additions:ProductRecord[]=sanitized.filter(row=>!existingSlugs.has(row.slug)).map(row=>({
    id:newId("product"),slug:row.slug,name:row.name,brand:String(row.brand||"RESET Clinic").slice(0,120),
    sku:null,category:row.category,subcategory_slugs:Array.isArray(row.subcategory_slugs)?row.subcategory_slugs.filter((v):v is string=>typeof v==="string").slice(0,20):[],
    product_line:row.product_line?String(row.product_line).slice(0,120):null,status:"draft",
    short_description:String(row.short_description||"").slice(0,500),description:String(row.description||"").slice(0,5000),
    price:row.price,currency:"UAH",stock_quantity:0,track_stock:true,size:row.size?String(row.size).slice(0,80):null,
    image_url:row.image_url?String(row.image_url).slice(0,1200):null,secondary_image_url:null,
    hover_label:"ПРИЗНАЧЕННЯ",hover_title:null,hover_text:null,how_to_use:null,key_ingredients:[],inci:null,
    seo_title:null,seo_description:null,seo_keywords:[],featured:false,sort_order:rows.length+1,
    published_at:null,created_at:now,updated_at:now
   }));
   return [...rows,...additions];
  });
  return NextResponse.json({ok:true,created_count:created.length-current.length,skipped:duplicates});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Помилка імпорту"},{status:400});}
}
