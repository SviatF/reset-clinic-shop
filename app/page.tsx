import { NativeSnapshotPage } from "../components/shop/NativePage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <NativeSnapshotPage pathname="/" />;
}
