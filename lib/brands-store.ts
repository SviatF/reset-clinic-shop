import "server-only";
import {BRANDS_PATH,mutateJsonStore,readJsonStore} from "@/lib/json-store";
import {DEFAULT_BRANDS,type StoreBrand} from "@/lib/catalog-brands";
export async function readBrands():Promise<StoreBrand[]>{return (await readJsonStore<StoreBrand[]>(BRANDS_PATH,DEFAULT_BRANDS)).data;}
export async function mutateBrands(message:string,fn:(brands:StoreBrand[])=>StoreBrand[]){return mutateJsonStore<StoreBrand[]>(BRANDS_PATH,DEFAULT_BRANDS,message,fn);}
