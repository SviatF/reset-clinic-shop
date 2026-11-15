"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import AdminExcelImport from "@/components/AdminExcelImport";
import SmartProductImage from "@/components/SmartProductImage";
import { getProductPricing, validateSalePrice } from "@/lib/product-pricing";

type Product = any;

const empty = {
  name: "", slug: "", brand: "", sku: "", category: "face", subcategory_slugs: [], product_line: "", status: "draft",
  price: "", sale_price: "", discount_percent: "", promo_enabled: false, stock_quantity: "0", size: "", short_description: "", description: "",
  image_url: "", secondary_image_url: "", hover_label: "ПРИЗНАЧЕННЯ", hover_title: "", hover_text: "",
  how_to_use: "", key_ingredients_text: "", inci: "", seo_title: "", seo_description: "",
  featured: false, sort_order: "0", track_stock: true,
};

function fromProduct(product: Product) {
  const pricing = getProductPricing(product);
  return {
    ...empty,
    ...product,
    price: String(product.price ?? ""),
    sale_price: pricing.onSale ? String(pricing.price) : "",
    discount_percent: pricing.onSale ? String(pricing.discountPercent) : "",
    promo_enabled: pricing.onSale,
    stock_quantity: String(product.stock_quantity ?? 0),
    sort_order: String(product.sort_order ?? 0),
    key_ingredients_text: Array.isArray(product.key_ingredients) ? product.key_ingredients.join(", ") : "",
    image_url: product.image_url || "",
    secondary_image_url: product.secondary_image_url || "",
    sku: product.sku || "",
    product_line: product.product_line || "",
    subcategory_slugs: Array.isArray(product.subcategory_slugs)?product.subcategory_slugs:[],
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
  const [categories, setCategories] = useState<any[]>([]);
  const [brands,setBrands] = useState<any[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [writable, setWritable] = useState(false);
  const [writeReason, setWriteReason] = useState<string | null>(null);
  const [view, setView] = useState<"catalog" | "import">("catalog");
  const [editorOpen, setEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [recovery, setRecovery] = useState<{ available: boolean; persisted: number; visible: number; missing?: number; sourceTotal?: number; needsRecovery: boolean } | null>(null);
  const [supplierImport, setSupplierImport] = useState<{ available: boolean; sourceCount: number; missing: number | null; alreadyPresent?: number; persisted?: number; reason?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selected = useMemo(() => products.find((item) => item.id === selectedId), [products, selectedId]);
  const brandOptions = useMemo(() => [...new Set(products.map(item => String(item.brand || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "uk")), [products]);
  const visibleProducts = useMemo(() => {
    const text = query.toLocaleLowerCase("uk").trim();
    return products.filter(item =>
      (statusFilter === "all" || item.status === statusFilter)
      && (brandFilter === "all" || item.brand === brandFilter)
      && (!text || [item.name, item.sku, item.brand, item.slug].some(value => String(value || "").toLocaleLowerCase("uk").includes(text)))
    );
  }, [products, query, statusFilter, brandFilter]);
  const activeCount = products.filter(item => item.status === "active").length;
  const draftCount = products.filter(item => item.status === "draft").length;
  const discountedCount = products.filter(item => getProductPricing(item).onSale).length;

  async function load() {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Не вдалося завантажити товари");
    setConfigured(data.configured);
    setWritable(Boolean(data.writable));
    setWriteReason(data.storage?.reason || (data.writable ? null : "Сховище товарів недоступне для запису."));
    setProducts(data.products || []);
    const response2=await fetch("/api/admin/categories",{cache:"no-store"});
    if(response2.ok)setCategories((await response2.json()).categories||[]);
    const response3=await fetch("/api/admin/brands",{cache:"no-store"});
    if(response3.ok)setBrands((await response3.json()).brands||[]);
    const recoveryResponse = await fetch("/api/admin/catalog-recovery", { cache: "no-store" });
    if (recoveryResponse.ok) setRecovery(await recoveryResponse.json());
    const supplierResponse = await fetch("/api/admin/supplier-draft-import", { cache: "no-store" });
    if (supplierResponse.ok) setSupplierImport(await supplierResponse.json());
  }

  useEffect(() => { load().catch((err) => setMessage(err.message)); }, []);

  async function persistRecoveredCatalog() {
    if (!window.confirm(`Додати ${recovery?.missing ?? "відсутні"} товарів із резервного каталогу до D1? Наявні товари, їхні ціни, залишки та редагування збережуться.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/catalog-recovery", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Не вдалося перенести товари");
      await load();
      setMessage(`Каталог D1 перевірено: ${data.persisted} товарів, додано ${data.added}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Помилка синхронізації");
    } finally {
      setSaving(false);
    }
  }

  async function importSupplierDrafts() {
    if (!supplierImport?.available || !supplierImport.missing) return;
    if (!window.confirm(
      `Імпортувати ${supplierImport.missing} відсутніх чернеток із 114 товарів до тестової D1? Спочатку буде завантажено приватну резервну копію каталогу, замовлень і налаштувань. Збережіть її в захищеному місці.`
    )) return;
    setSaving(true);
    setMessage("");
    try {
      // Require a successful private, authenticated full-storage export before write.
      // Backup contains customer/order data, and must never be uploaded to GitHub.
      const exportResponse = await fetch("/api/admin/storage-export", { cache: "no-store" });
      if (!exportResponse.ok) throw new Error("Резервну копію сховища не створено — імпорт зупинено");
      const blob = await exportResponse.blob();
      if (blob.size < 10) throw new Error("Порожня резервна копія — імпорт зупинено");
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `reset-clinic-d1-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(href), 30000);
      if (!window.confirm(
        "Резервну копію завантажено? Перевір, що файл збережено. Натисни OK лише після перевірки — тоді 114 нових товарів буде додано як чернетки без перезапису наявних."
      )) {
        setMessage("Резервну копію створено. Імпорт скасовано до підтвердження.");
        return;
      }
      const response = await fetch("/api/admin/supplier-draft-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "IMPORT_114_SUPPLIER_DRAFTS" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Імпорт у D1 не завершився");
      await load();
      setMessage(`Імпорт D1 виконано: додано ${data.added} чернеток із 114, залишилось ${data.missing}. Наявні товари й замовлення не перезаписано.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Помилка імпорту");
    } finally {
      setSaving(false);
    }
  }

  function update(key: string, value: unknown) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  function updateRegularPrice(value: string) {
    setForm((current: any) => {
      const updated = { ...current, price: value };
      const percent = Number(current.discount_percent);
      if (current.promo_enabled && Number(value) > 0 && percent > 0 && percent < 100)
        updated.sale_price = (Math.round(Number(value) * (1 - percent / 100) * 100) / 100).toFixed(2);
      return updated;
    });
  }

  function updateDiscountPercent(value: string) {
    setForm((current: any) => {
      const percent = Number(value);
      const regular = Number(current.price);
      const sale = regular > 0 && percent > 0 && percent < 100
        ? Math.round(regular * (1 - percent / 100) * 100) / 100 : null;
      return { ...current, discount_percent: value, sale_price: sale !== null && sale > 0 && sale < regular ? sale.toFixed(2) : "" };
    });
  }

  function updateSalePrice(value: string) {
    setForm((current: any) => {
      const regular = Number(current.price);
      const sale = Number(value);
      const percent = value !== "" && regular > 0 && sale > 0 && sale < regular
        ? String(Number(((1 - sale / regular) * 100).toFixed(1))) : "";
      return { ...current, sale_price: value, discount_percent: percent };
    });
  }

  function togglePromotion(enabled: boolean) {
    setForm((current: any) => ({ ...current, promo_enabled: enabled, sale_price: enabled ? current.sale_price : "", discount_percent: enabled ? current.discount_percent : "" }));
  }

  function selectProduct(product: Product) {
    setView("catalog");
    setEditorOpen(true);
    setSelectedId(product.id);
    setForm(fromProduct(product));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createNew() {
    setView("catalog");
    setEditorOpen(true);
    setSelectedId(null);
    setForm(empty);
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!writable) {
      setMessage(writeReason || "Не вдалося зберегти: сховище товарів не налаштоване для запису.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const salePrice = form.promo_enabled ? validateSalePrice(form.price, form.sale_price) : null;
      if (form.promo_enabled && salePrice === null) throw new Error("Вкажіть знижку або кінцеву акційну ціну");
      const payload = {
        ...form,
        price: Number(form.price || 0),
        sale_price: salePrice,
        stock_quantity: Number(form.stock_quantity || 0),
        sort_order: Number(form.sort_order || 0),
        key_ingredients: String(form.key_ingredients_text || "").split(",").map((value) => value.trim()).filter(Boolean),
      };
      delete payload.key_ingredients_text;
      delete payload.discount_percent;
      delete payload.promo_enabled;
      const response = await fetch(selectedId ? `/api/admin/products/${selectedId}` : "/api/admin/products", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Не вдалося зберегти товар");
      await load();
      if (data.product?.id) { setSelectedId(data.product.id); setForm(fromProduct(data.product)); }
      setMessage("Товар збережено ✓");
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
    setEditorOpen(false);
    setSelectedId(null);
    setForm(empty);
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

  const promoPreview = getProductPricing({ price: Number(form.price), sale_price: form.promo_enabled ? form.sale_price : null });
  return (
    <div className="admin-products-page">
      <div className="admin-page-head"><div><span>CATALOG CONTROL</span><h1>Товари</h1><p>Ціни, індивідуальні акції, залишки, фото, контент і SEO товарів.</p></div><button className="admin-primary" onClick={createNew} disabled={!writable}>+ ДОДАТИ ТОВАР</button></div>
      {supplierImport?.available && supplierImport.missing !== null && supplierImport.missing > 0 && <div className="admin-connect-card">
        <span>ІМПОРТ ПОСТАЧАЛЬНИКІВ · D1</span>
        <h2>Додати нові товари до бази як чернетки</h2>
        <p>У вихідному імпорті 114 позицій. Із них у D1 ще відсутні {supplierImport.missing}. Перед записом система завантажить повну резервну копію сховища. Існуючі товари, ціни, залишки й замовлення не змінюються.</p>
        <button className="admin-primary" type="button" disabled={saving || !writable} onClick={importSupplierDrafts}>Зробити резервну копію та перенести {supplierImport.missing} чернеток у D1</button>
      </div>}
      {recovery?.needsRecovery && <div className="admin-connect-card">
        <span>ІМПОРТ У D1</span>
        <h2>У базі відсутні товари з вихідного каталогу</h2>
        <p>У D1 зараз {recovery.persisted} товарів. Із {recovery.sourceTotal ?? 165} позицій поточного каталогу ще відсутні {recovery.missing ?? recovery.visible - recovery.persisted}. Можна додати їх без перезапису вже збережених записів.</p>
        <button className="admin-primary" type="button" disabled={saving} onClick={persistRecoveredCatalog}>Перенести відсутні товари до D1</button>
      </div>}
      {writable === false && configured !== null && <div className="admin-connect-card" role="status"><span>ТІЛЬКИ ПЕРЕГЛЯД</span><h2>Запис товарів ще не підключений</h2><p>Для збереження цін, фото, категорій і нових товарів підключіть тестову базу Cloudflare D1 або GitHub Token з доступом до цього приватного репозиторію. Наразі відображається резервний каталог.</p></div>}
      {message && <div className="admin-toast">{message}</div>}

      {products.some(product => product.status === "active" && !product.image_url && product.slug !== "parsley-seed-anti-oxidant-eye-cream") && <div className="admin-connect-card" role="status">
        <span>ФОТОКАТАЛОГ · ПОТРЕБУЄ УВАГИ</span>
        <h2>У {products.filter(product => product.status === "active" && !product.image_url && product.slug !== "parsley-seed-anti-oxidant-eye-cream").length} активних товарів немає фотографії</h2>
        <p>Для Dermafirm та Braderm можна відновити оригінальні фото із таблиці постачальника нижче — без дублювання товарів і без зміни цін або залишків. Для інших брендів додайте перевірені зображення через редактор товару. Фото зберігаються в R2 лише коли D1/R2 активовані.</p>
      </div>}
      <AdminExcelImport onFinished={load} disabled={!writable} />
      <div className="admin-product-workspace">
        <aside className="admin-product-list">
          <div className="admin-list-head"><strong>{products.length} позицій</strong><span>ACTIVE / DRAFT / ARCHIVED</span></div>
          {products.length ? products.map((product) => {
            const pricing = getProductPricing(product);
            return <button key={product.id} className={selectedId === product.id ? "is-selected" : ""} onClick={() => selectProduct(product)}>
              <div className="admin-product-thumb"><SmartProductImage src={product.image_url} alt={product.name} fallback={<span>{product.name?.slice(0,1)}</span>} /></div>
              <div><strong>{product.name}</strong><span>{product.brand}</span><div className="admin-list-price">
                {pricing.onSale ? <><del>{pricing.originalPrice.toFixed(2)} грн</del><b>{pricing.price.toFixed(2)} грн</b><em>−{pricing.discountPercent}%</em></> : <span>{pricing.price.toFixed(2)} грн</span>}
              </div><small>{product.stock_quantity} шт. · {product.category}</small></div>
              <i className={`status-dot status-${product.status}`} />
            </button>;
          }) : <p className="admin-empty">Товарів ще немає.</p>}
        </aside>

        <form className="admin-product-form" onSubmit={save}>
          <div className="admin-form-title"><div><span>{selectedId ? "EDIT PRODUCT" : "NEW PRODUCT"}</span><h2>{selectedId ? form.name || "Товар" : "Новий товар"}</h2></div>{selectedId && <button type="button" className="admin-danger" onClick={remove} disabled={!writable}>Видалити</button>}</div>

          <section className="admin-form-section"><h3>Основне</h3><div className="admin-form-grid">
            <label className="wide"><span>Назва товару *</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
            <label><span>Бренд</span><input list="reset-brands" value={form.brand} onChange={(e) => update("brand", e.target.value)} /><datalist id="reset-brands">{brands.filter(b=>b.status==="active").map(b=><option key={b.id} value={b.name}/>)}</datalist></label>
            <label><span>SKU</span><input value={form.sku} onChange={(e) => update("sku", e.target.value)} /></label>
            <label><span>Slug</span><input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="auto-from-name" /></label>
            <label><span>Категорія</span><select value={form.category} onChange={(e) => setForm((f:any)=>({...f,category:e.target.value,subcategory_slugs:[]}))}><option value="face">Обличчя</option><option value="body">Тіло</option><option value="hair">Волосся</option><option value="other">Інше</option></select></label>
            <fieldset className="wide" style={{border:"1px solid #ddd",padding:12}}><legend>Підкатегорії (можна кілька)</legend><div style={{display:"flex",flexWrap:"wrap",gap:12}}>{categories.filter(c=>c.parent_slug===form.category).map(c=><label key={c.id} style={{display:"flex",alignItems:"center",gap:5}}><input type="checkbox" checked={(form.subcategory_slugs||[]).includes(c.slug)} onChange={e=>setForm((f:any)=>({...f,subcategory_slugs:e.target.checked?[...(f.subcategory_slugs||[]),c.slug]:(f.subcategory_slugs||[]).filter((x:string)=>x!==c.slug)}))}/>{c.name}</label>)}</div></fieldset>
            <label><span>Продуктова лінійка</span><input list="reset-lines" value={form.product_line||""} onChange={(e)=>update("product_line",e.target.value)} placeholder="Peptology / Soothing Repair R4"/><datalist id="reset-lines">{brands.find(b=>b.name===form.brand)?.lines.map((line:string)=><option key={line} value={line}/>)}</datalist></label>
            <label><span>Статус</span><select value={form.status} onChange={(e) => update("status", e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
            <label><span>Звичайна ціна, грн</span><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updateRegularPrice(e.target.value)} /></label>
            <label><span>Залишок, шт.</span><input type="number" min="0" value={form.stock_quantity} onChange={(e) => update("stock_quantity", e.target.value)} /></label>
            <label><span>Об’єм / розмір</span><input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="10 mL" /></label>
            <label><span>Сортування</span><input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} /></label>
            <label className="admin-check"><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} /><span>Показувати в рекомендованих</span></label>
            <label className="admin-check"><input type="checkbox" checked={form.track_stock} onChange={(e) => update("track_stock", e.target.checked)} /><span>Відслідковувати stock</span></label>
          </div></section>

          <section className="admin-form-section admin-promo-section" id="sale-settings">
            <div className="admin-promo-head">
              <div><span>PRODUCT PROMOTION</span><h3>Акції та знижки</h3><p>Знижка діє тільки для цього товару, доки ви її не вимкнете.</p></div>
              <label className="admin-promo-switch"><input type="checkbox" checked={Boolean(form.promo_enabled)} onChange={(e) => togglePromotion(e.target.checked)} /><span>{form.promo_enabled ? "Знижка увімкнена" : "Увімкнути знижку"}</span></label>
            </div>
            {form.promo_enabled ? <>
              <div className="admin-form-grid">
                <label><span>Розмір знижки, %</span><input type="number" step="0.1" min="0.1" max="99.9" value={form.discount_percent} onChange={(e) => updateDiscountPercent(e.target.value)} placeholder="20" /></label>
                <label><span>Кінцева ціна для покупця, грн</span><input type="number" step="0.01" min="0.01" max={Math.max(0, Number(form.price) - 0.01)} value={form.sale_price} onChange={(e) => updateSalePrice(e.target.value)} placeholder="800.00" required /></label>
              </div>
              {promoPreview.onSale ? <div className="admin-promo-preview"><span className="shop-sale-badge admin-promo-badge">−{promoPreview.discountPercent}%</span><div><small>ПОКУПЕЦЬ ПОБАЧИТЬ</small><del>{promoPreview.originalPrice.toFixed(2)} грн</del><strong>{promoPreview.price.toFixed(2)} грн</strong></div><p>Різниця: {(promoPreview.originalPrice - promoPreview.price).toFixed(2)} грн. Ця сума також застосовується під час оплати.</p></div> : <p className="admin-promo-hint">Введіть відсоток або кінцеву ціну менш ніж звичайна. Друге поле розрахується автоматично.</p>}
            </> : <p className="admin-promo-hint">Товар продається за звичайною ціною. Увімкніть перемикач, щоб створити персональну акцію.</p>}
          </section>

          <section className="admin-form-section"><h3>Фото</h3><div className="admin-image-admin">
            <div className="admin-image-preview"><SmartProductImage src={form.image_url} alt="Preview" fallback={<span>NO IMAGE</span>} /></div>
            <div><label className="admin-upload"><input type="file" disabled={!writable} accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} /><span>{uploading ? "Завантаження…" : "Завантажити фото"}</span></label><label><span>Або URL</span><input value={form.image_url} onChange={(e) => update("image_url", e.target.value)} /></label></div>
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

          <div className="admin-form-actions"><button className="admin-primary" type="submit" disabled={saving || !writable}>{saving ? "ЗБЕРІГАЄМО…" : selectedId ? "ЗБЕРЕГТИ ЗМІНИ" : "СТВОРИТИ ТОВАР"}</button><span>Зміни активного товару відображаються у storefront після збереження.</span></div>
        </form>
      </div>
    </div>
  );
}
