"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, pass }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Не вдалося увійти");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося увійти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-login-card" onSubmit={submit}>
      <div className="admin-login-brand"><span>RESET</span><small>COMMERCE CONTROL</small></div>
      <div className="admin-login-copy"><span>SECURE ADMIN</span><h1>Керування магазином</h1><p>Товари, залишки, замовлення, продажі та SEO в одному просторі.</p></div>
      <label className="admin-login-field"><span>Admin login</span><input type="text" value={login} onChange={(event) => setLogin(event.target.value)} autoFocus autoComplete="username" required /></label>
      <label className="admin-login-field"><span>Admin pass</span><input type="password" value={pass} onChange={(event) => setPass(event.target.value)} autoComplete="current-password" required /></label>
      <button type="submit" disabled={loading}>{loading ? "ПЕРЕВІРЯЄМО…" : "УВІЙТИ В АДМІНКУ"}</button>
      {error && <p className="admin-login-error">{error}</p>}
    </form>
  );
}
