import { CatalogPage } from "../../../components/catalog/CatalogPage";
import { NativeShell } from "../../../components/shop/NativePage";
import { listProducts } from "../../../lib/catalog/provider";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await listProducts();
  return <NativeShell><CatalogPage title="Каталог" products={products} /></NativeShell>;
}
