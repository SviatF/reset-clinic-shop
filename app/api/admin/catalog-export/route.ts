import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {readProducts} from "@/lib/commerce-json";
import {readCategories} from "@/lib/catalog-categories";
import {readBrands} from "@/lib/brands-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const data={exported_at:new Date().toISOString(),products:await readProducts(),categories:await readCategories(),brands:await readBrands()};
  return new NextResponse(JSON.stringify(data,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="reset-catalog-backup.json"',"Cache-Control":"no-store"}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Export failed"},{status:500});
 }
}
