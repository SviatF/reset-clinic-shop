import "server-only";
import {CATEGORIES_PATH,readJsonStore,mutateJsonStore} from "@/lib/json-store";
import {DEFAULT_CATEGORIES,type StoreCategory} from "@/lib/catalog-taxonomy";
export async function readCategories():Promise<StoreCategory[]>{return (await readJsonStore<StoreCategory[]>(CATEGORIES_PATH,DEFAULT_CATEGORIES)).data;}
export async function mutateCategories(message:string,mutate:(rows:StoreCategory[])=>StoreCategory[]){return mutateJsonStore<StoreCategory[]>(CATEGORIES_PATH,DEFAULT_CATEGORIES,message,mutate);}
