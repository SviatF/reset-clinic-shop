import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function SecureAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><strong>RESET</strong><span>COMMERCE</span></Link>
        <nav>
          <Link href="/admin"><i>01</i><span>Dashboard</span></Link>
          <Link href="/admin/products"><i>02</i><span>Товари</span></Link>
          <Link href="/admin/orders"><i>03</i><span>Замовлення</span></Link>
          <Link href="/" target="_blank"><i>↗</i><span>Відкрити магазин</span></Link>
        </nav>
        <div className="admin-sidebar-foot"><span>RESET CLINIC SHOP</span><AdminLogoutButton /></div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
