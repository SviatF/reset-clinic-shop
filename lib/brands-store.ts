import "server-only";
import {BRANDS_PATH,mutateJsonStore,readJsonStore} from "@/lib/json-store";
import {DEFAULT_BRANDS,type StoreBrand} from "@/lib/catalog-brands";

/** Preserve stored brand records and add newly bundled brand definitions. */
function withRequestedBrands(rows: StoreBrand[]): StoreBrand[] {
 const current = new Map(rows.map(row => [row.id,row]));
 for(const brand of DEFAULT_BRANDS){
  if(!current.has(brand.id)) current.set(brand.id,brand);
 }
 return [...current.values()];
}

export async function readBrands():Promise<StoreBrand[]>{
 const snapshot=await readJsonStore<StoreBrand[]>(BRANDS_PATH,DEFAULT_BRANDS);
 return withRequestedBrands(Array.isArray(snapshot.data)?snapshot.data:[]);
}
export async function mutateBrands(message:string,fn:(brands:StoreBrand[])=>StoreBrand[]){
 return mutateJsonStore<StoreBrand[]>(BRANDS_PATH,DEFAULT_BRANDS,message,rows=>fn(withRequestedBrands(rows)));
}
