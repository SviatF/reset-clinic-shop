"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }
  return <button className="admin-logout" type="button" onClick={logout}>Вийти ↗</button>;
}
