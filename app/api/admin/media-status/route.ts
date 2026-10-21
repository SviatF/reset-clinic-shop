import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {shopMediaBucket} from "@/lib/r2-media";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 return NextResponse.json({r2:Boolean(shopMediaBucket())},{headers:{"Cache-Control":"no-store"}});
}
