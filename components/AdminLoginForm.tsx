"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ password }),
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
      <label className="admin-login-field"><span>Пароль адміністратора</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus autoComplete="current-password" required /></label>
      <button type="submit" disabled={loading}>{loading ? "ПЕРЕВІРЯЄМО…" : "УВІЙТИ В АДМІНКУ"}</button>
      {error && <p className="admin-login-error">{error}</p>}
    </form>
  );
}
