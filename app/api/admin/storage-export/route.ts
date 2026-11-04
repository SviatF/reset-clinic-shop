import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {isAdminAuthenticated} from "@/lib/admin-auth";
import {readProducts,readOrders,readActivity} from "@/lib/commerce-json";
import {readCategories} from "@/lib/catalog-categories";
import {readBrands} from "@/lib/brands-store";
import {usingCloudflareStore,usingLocalJsonStore} from "@/lib/json-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/** Private point-in-time backup for a staged D1 migration.
 * Contains contact and delivery details from orders. NEVER publish or commit it.
 */
export async function GET(){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!usingCloudflareStore() && !usingLocalJsonStore() && !process.env.GITHUB_TOKEN)
    return NextResponse.json({error:"Persistent source storage unavailable. Refusing an incomplete bundled-only export."},{status:503});
  try{
    const [products,categories,brands,orders,activity]=await Promise.all([
      readProducts(),readCategories(),readBrands(),readOrders(),readActivity()
    ]);
    const snapshot={exported_at:new Date().toISOString(),
      source:usingCloudflareStore()?"cloudflare":usingLocalJsonStore()?"local":"github",
      products,categories,brands,orders,activity};
    const serialized=JSON.stringify(snapshot,null,2);
    const digest=createHash("sha256").update(serialized).digest("hex");
    return new NextResponse(serialized,{
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Content-Disposition":'attachment; filename="reset-clinic-private-storage-backup.json"',
        "Cache-Control":"no-store, private",
        "X-Content-Type-Options":"nosniff",
        "X-Backup-SHA256":digest
      }
    });
  }catch(error){
    console.error("Storage backup export failed",error);
    return NextResponse.json({error:"Не вдалося експортувати всі документи сховища"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}