import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {cloudflareReadJson} from "@/lib/cloudflare-store";
import {shopMediaBucket} from "@/lib/r2-media";
import {usingCloudflareStore} from "@/lib/json-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const names=["products","categories","brands","orders","activity"] as const;

/** Admin-only hashes for comparison against prepare-shop-d1's private manifest.
 * Never returns customer records or exposes D1 content publicly.
 */
export async function GET(){
 if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
 try {
  const docs=await Promise.all(names.map(async name=>{
    const pathname="data/"+name+".json";
    // Read the actual D1 binding directly, even before a production switch.
    const row=await cloudflareReadJson<unknown[]>(pathname,[]);
    const json=JSON.stringify(row.data);
    return {pathname,records:Array.isArray(row.data)?row.data.length:null,
      sha256:createHash("sha256").update(json).digest("hex"),version:row.sha};
  }));
  return NextResponse.json({
    ready:docs.every(row=>row.version!==null)&&Boolean(shopMediaBucket()),
    active:usingCloudflareStore(),
    r2Bound:Boolean(shopMediaBucket()),
    documents:docs
  },{headers:{"Cache-Control":"no-store, private"}});
 } catch(error){
   console.error("D1/R2 readiness check failed",error);
   return NextResponse.json({ready:false,error:"D1/R2 binding or shop_documents table unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}