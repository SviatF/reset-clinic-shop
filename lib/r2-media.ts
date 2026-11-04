import "server-only";
import {getCloudflareContext} from "@opennextjs/cloudflare";
type Asset={body:ReadableStream;writeHttpMetadata(headers:Headers):void};
type Bucket={put(key:string,data:ArrayBuffer,options?:{httpMetadata?:{contentType:string}}):Promise<unknown>;get(key:string):Promise<Asset|null>};
export function shopMediaBucket():Bucket|null{
 try{
  const env=getCloudflareContext().env as unknown as {SHOP_MEDIA?:Bucket};
  return env.SHOP_MEDIA||null;
 }catch{return null;}
}
export function productMime(path:string){
 const extension=path.split(".").pop()?.toLowerCase();
 return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",avif:"image/avif"} as Record<string,string>)[extension||""]||"application/octet-stream";
}
