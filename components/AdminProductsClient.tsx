"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Product = any;

const empty = {
  name: "", slug: "", brand: "", sku: "", category: "face", status: "draft",
  price: "", stock_quantity: "0", size: "", short_description: "", description: "",
  image_url: "", secondary_image_url: "", hover_label: "ПРИЗНАЧЕННЯ", hover_title: "", hover_text: "",
  how_to_use: "", key_ingredients_text: "", inci: "", seo_title: "", seo_description: "",
  featured: false, sort_order: "0", track_stock: true,
};

function fromProduct(product: Product) {
  return {
    ...empty,
    ...product,
    price: String(product.price ?? ""),
    stock_quantity: String(product.stock_quantity ?? 0),
    sort_order: String(product.sort_order ?? 0),
    key_ingredients_text: Array.isArray(product.key_ingredients) ? product.key_ingredients.join(", ") : "",
    image_url: product.image_url || "",
    secondary_image_url: product.secondary_image_url || "",
    sku: product.sku || "",
    size: product.size || "",
    hover_label: product.hover_label || "ПРИЗНАЧЕННЯ",
    hover_title: product.hover_title || "",
    hover_text: product.hover_text || "",
    how_to_use: product.how_to_use || "",
    inci: product.inci || "",
    seo_title: product.seo_title || "",
    seo_description: product.seo_description || "",
  };
}

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selected = useMemo(() => products.find((item) => item.id === selectedId), [products, selectedId]);

  async function load() {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Не вдалося завантажити товари");
    setConfigured(data.configured);
    setProducts(data.products || []);
  }

  useEffect(() => { load().catch((err) => setMessage(err.message)); }, []);

  function update(key: string, value: unknown) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  function selectProduct(product: Product) {
    setSelectedId(product.id);
    setForm(fromProduct(product));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createNew() {
    setSelectedId(null);
    setForm(empty);
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        price: Number(form.price || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        sort_order: Number(form.sort_order || 0),
        key_ingredients: String(form.key_ingredients_text || "").split(",").map((value) => value.trim()).filter(Boolean),
      };
      delete payload.key_ingredients_text;
      const response = await fetch(selectedId ? `/api/admin/products/${selectedId}` : "/api/admin/products", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Не вдалося зберегти товар");
      await load();
      if (data.product?.id) { setSelectedId(data.product.id); setForm(fromProduct(data.product)); }
      setMessage("Збережено ✓");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!selectedId || !selected) return;
    if (!window.confirm(`Видалити товар «${selected.name}»?`)) return;
    const response = await fetch(`/api/admin/products/${selectedId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setMessage(data?.error || "Не вдалося видалити");
    await load();
    createNew();
    setMessage("Товар видалено");
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Upload failed");
      update("image_url", result.url);
      setMessage("Фото завантажено. Натисніть «Зберегти товар». ");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <div className="admin-products-page">
      <div className="admin-page-head"><div><span>CATALOG CONTROL</span><h1>Товари</h1><p>Ціна, stock, статус, фото, контент і SEO кожної позиції.</p></div><button className="admin-primary" onClick={createNew}>+ ДОДАТИ ТОВАР</button></div>
      {configured === false && <div className="admin-connect-card"><span>DATABASE</span><h2>Потрібне підключення Supabase</h2><p>CRUD уже реалізований у коді. Після створення бази форма почне записувати товари в каталог.</p></div>}
      {message && <div className="admin-toast">{message}</div>}

      <div className="admin-product-workspace">
        <aside className="admin-product-list">
          <div className="admin-list-head"><strong>{products.length} позицій</strong><span>ACTIVE / DRAFT / ARCHIVED</span></div>
          {products.length ? products.map((product) => <button key={product.id} className={selectedId === product.id ? "is-selected" : ""} onClick={() => selectProduct(product)}>
            <div className="admin-product-thumb">{product.image_url ? <img src={product.image_url} alt="" /> : <span>{product.name?.slice(0,1)}</span>}</div>
            <div><strong>{product.name}</strong><span>{product.brand} · {Number(product.price).toFixed(2)} грн</span><small>{product.stock_quantity} шт. · {product.category}</small></div>
            <i className={`status-dot status-${product.status}`} />
          </button>) : <p className="admin-empty">Товарів ще немає.</p>}
        </aside>

        <form className="admin-product-form" onSubmit={save}>
          <div className="admin-form-title"><div><span>{selectedId ? "EDIT PRODUCT" : "NEW PRODUCT"}</span><h2>{selectedId ? form.name || "Товар" : "Новий товар"}</h2></div>{selectedId && <button type="button" className="admin-danger" onClick={remove}>Видалити</button>}</div>

          <section className="admin-form-section"><h3>Основне</h3><div className="admin-form-grid">
            <label className="wide"><span>Назва товару *</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
            <label><span>Бренд</span><input value={form.brand} onChange={(e) => update("brand", e.target.value)} /></label>
            <label><span>SKU</span><input value={form.sku} onChange={(e) => update("sku", e.target.value)} /></label>
            <label><span>Slug</span><input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="auto-from-name" /></label>
            <label><span>Категорія</span><select value={form.category} onChange={(e) => update("category", e.target.value)}><option value="face">Обличчя</option><option value="body">Тіло</option><option value="hair">Волосся</option><option value="other">Інше</option></select></label>
            <label><span>Статус</span><select value={form.status} onChange={(e) => update("status", e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
            <label><span>Ціна, грн</span><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} /></label>
            <label><span>Залишок, шт.</span><input type="number" min="0" value={form.stock_quantity} onChange={(e) => update("stock_quantity", e.target.value)} /></label>
            <label><span>Об’єм / розмір</span><input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="10 mL" /></label>
            <label><span>Сортування</span><input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} /><span>Показувати в рекомендованих</span></label>
            <label className="admin-check"><input type="checkbox" checked={form.track_stock} onChange={(e) => update("track_stock", e.target.checked)} /><span>Відслідковувати stock</span></label>
          </div></section>

          <section className="admin-form-section"><h3>Фото</h3><div className="admin-image-admin">
            <div className="admin-image-preview">{form.image_url ? <img src={form.image_url} alt="Preview" /> : <span>NO IMAGE</span>}</div>
            <div><label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} /><span>{uploading ? "Завантаження…" : "Завантажити фото"}</span></label><label><span>Або URL</span><input value={form.image_url} onChange={(e) => update("image_url", e.target.value)} /></label></div>
          </div></section>

          <section className="admin-form-section"><h3>Контент</h3><div className="admin-form-grid">
            <label className="wide"><span>Короткий опис</span><textarea value={form.short_description} onChange={(e) => update("short_description", e.target.value)} rows={2} /></label>
            <label className="wide"><span>Повний опис</span><textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} /></label>
            <label><span>Hover — заголовок</span><input value={form.hover_title} onChange={(e) => update("hover_title", e.target.value)} /></label>
            <label><span>Hover — текст</span><input value={form.hover_text} onChange={(e) => update("hover_text", e.target.value)} /></label>
            <label className="wide"><span>Як застосовувати</span><textarea value={form.how_to_use} onChange={(e) => update("how_to_use", e.target.value)} rows={3} /></label>
            <label className="wide"><span>Ключові компоненти — через кому</span><input value={form.key_ingredients_text} onChange={(e) => update("key_ingredients_text", e.target.value)} /></label>
            <label className="wide"><span>INCI</span><textarea value={form.inci} onChange={(e) => update("inci", e.target.value)} rows={4} /></label>
          </div></section>

          <section className="admin-form-section admin-seo-section"><h3>SEO</h3><div className="admin-form-grid">
            <label className="wide"><span>SEO Title</span><input value={form.seo_title} onChange={(e) => update("seo_title", e.target.value)} maxLength={180} /><small>{String(form.seo_title).length}/60 рекомендовано</small></label>
            <label className="wide"><span>Meta Description</span><textarea value={form.seo_description} onChange={(e) => update("seo_description", e.target.value)} rows={3} maxLength={320} /><small>{String(form.seo_description).length}/155 рекомендовано</small></label>
            <div className="admin-serp-preview wide"><span>GOOGLE PREVIEW</span><strong>{form.seo_title || form.name || "Назва товару"}</strong><small>reset-clinic-shop.vercel.app/product/{form.slug || "product-slug"}</small><p>{form.seo_description || form.short_description || "Опис сторінки товару для пошукової видачі."}</p></div>
          </div></section>

          <div className="admin-form-actions"><button className="admin-primary" type="submit" disabled={saving || configured === false}>{saving ? "ЗБЕРІГАЄМО…" : selectedId ? "ЗБЕРЕГТИ ЗМІНИ" : "СТВОРИТИ ТОВАР"}</button><span>Зміни активного товару відображаються у storefront після збереження.</span></div>
        </form>
      </div>
    </div>
  );
}
