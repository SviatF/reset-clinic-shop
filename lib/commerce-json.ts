import "server-only";

import { randomUUID } from "node:crypto";
import productsData from "@/data/products.json";
import type { ActivityRecord, OrderRecord, ProductRecord } from "@/lib/commerce-types";
import { ACTIVITY_PATH, ORDERS_PATH, PRODUCTS_PATH, mutateJsonStore, readJsonStore } from "@/lib/json-store";

const productSeed = productsData as unknown as ProductRecord[];

export async function readProducts() {
  return (await readJsonStore<ProductRecord[]>(PRODUCTS_PATH, productSeed)).data;
}

export async function mutateProducts(message: string, mutate: (products: ProductRecord[]) => ProductRecord[] | Promise<ProductRecord[]>) {
  return mutateJsonStore<ProductRecord[]>(PRODUCTS_PATH, productSeed, message, mutate);
}

export async function readOrders() {
  return (await readJsonStore<OrderRecord[]>(ORDERS_PATH, [])).data;
}

export async function mutateOrders(message: string, mutate: (orders: OrderRecord[]) => OrderRecord[] | Promise<OrderRecord[]>) {
  return mutateJsonStore<OrderRecord[]>(ORDERS_PATH, [], message, mutate);
}

export async function readActivity() {
  return (await readJsonStore<ActivityRecord[]>(ACTIVITY_PATH, [])).data;
}

export async function appendActivity(input: Omit<ActivityRecord, "id" | "created_at"> & { id?: number; created_at?: string }) {
  const entry: ActivityRecord = {
    id: input.id || Date.now(),
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    title: input.title,
    metadata: input.metadata || {},
    created_at: input.created_at || new Date().toISOString(),
  };
  await mutateJsonStore<ActivityRecord[]>(ACTIVITY_PATH, [], `Admin activity: ${entry.event_type}`, (items) => [entry, ...items].slice(0, 500));
  return entry;
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}
