"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import SmartProductImage from "@/components/SmartProductImage";
import AdminHistolabPhotoRepair from "@/components/AdminHistolabPhotoRepair";
import AdminVerifiedSupplierRepair from "@/components/AdminVerifiedSupplierRepair";

type Product = {
  id: string; slug: string; sku?: string | null; name: string; brand: string;
  status: "active" | "draft" | "archived"; image_url?: string | null;
  price: number | string; stock_quantity: number; track_stock: boolean;
};
type PublishRow = {
  id: string; name: string; brand: string; eligible: boolean; reason: string | null;
  zeroStock: boolean; imageUrl: string | null; stock: number; price: number;
};
type Preview = {
  version: string; rows: PublishRow[]; eligibleCount: number;
  skippedCount: number; zeroStockCount: number;
};
export default function AdminPublishingClient({
  products, writable, onFinished, onClose, onEdit,
}: {
  products: Product[]; writable: boolean;
  onFinished: () => Promise<void>; onClose: () => void; onEdit: (id: string) => void;
}) {
  const [tab, setTab] = useState<"drafts" | "photos">("drafts");
  const [brand, setBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b,"uk")), [products]);
  const drafts = useMemo(() => products.filter(p => p.status === "draft"), [products]);
  const missingPhoto = useMemo(() => products.filter(p => !String(p.image_url || "").trim()), [products]);
  const visible = useMemo(() => {
    const needle = search.toLocaleLowerCase("uk").trim();
    return (tab === "drafts" ? drafts : missingPhoto).filter(p =>
      (brand === "all" || brand === p.brand) &&
      (!needle || [p.name,p.sku,p.slug].some(s => String(s || "").toLocaleLowerCase("uk").includes(needle)))
    );
  }, [tab, drafts, missingPhoto, brand, search]);
  const eligibleOnScreen = visible.filter(p => p.status === "draft" &&
    Number(p.price) > 0 && Boolean(String(p.image_url || "").trim())).map(p => p.id);
  const selected = new Set(selectedIds);
  const previewReady = preview?.rows.filter(r => r.eligible).length || 0;

  function changeTab(next: "drafts" | "photos") {
    setTab(next); setSelectedIds([]);setPreview(null);setError("");setMessage("");
  }
  function resetPreview() { setPreview(null);setError("");setMessage(""); }
  function toggle(id: string, checked: boolean) {
    setSelectedIds(previous => checked ? [...previous.filter(x => x !== id), id]
      : previous.filter(x => x !== id));
    resetPreview();
  }
  async function makePreview() {
    if (!selectedIds.length || busy) return;
    setBusy(true);setError("");setMessage("");
    try {
      const response = await fetch("/api/admin/products/bulk-publish", {
        method:"POST",headers:{"Content-Type":"application/json"},
        cache:"no-store",body:JSON.stringify({mode:"preview",ids:selectedIds}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не вдалося перевірити товари");
      setPreview(data as Preview);
    } catch (err) { setError(err instanceof Error ? err.message : "Помилка попереднього перегляду"); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!preview || busy || !previewReady || !writable) return;
    const warning = preview.zeroStockCount
      ? `\n\nУ ${preview.zeroStockCount} товарів залишок 0 — вони будуть видимі, але показуватимуться як відсутні в наявності. Залишки не змінюються.` : "";
    if (!window.confirm(`Опублікувати ${preview.eligibleCount} товарів? ${preview.skippedCount} неповних карток будуть пропущені.${warning}\n\nПісля підтвердження товари стануть доступні в магазині.`)) return;
    setBusy(true);setError("");setMessage("");
    try {
      const response = await fetch("/api/admin/products/bulk-publish",{
        method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
        body:JSON.stringify({mode:"commit",ids:selectedIds,version:preview.version,confirm:true}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не вдалося опублікувати");
      setMessage(`Опубліковано ${data.published} товарів. Пропущено: ${data.skipped}. Із нульовим залишком: ${data.zeroStock}.`);
      setPreview(null);setSelectedIds([]);
      try { await onFinished(); } catch {
        setError("Товари збережено в D1, але оновити список не вдалося. Перезавантажте сторінку.");
      }
    } catch (err) {
      if (err instanceof Error && /Каталог змінився/.test(err.message)) setPreview(null);
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally { setBusy(false); }
  }
  async function uploadPhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !writable) return;
    setUploadingId(id);setError("");setMessage("");
    try {
      if (!["image/png","image/jpeg","image/webp","image/avif"].includes(file.type))
        throw new Error("Оберіть JPG, PNG, WebP або AVIF");
      const form = new FormData();
      form.append("file",file);
      const uploaded = await fetch("/api/admin/upload",{method:"POST",body:form});
      const media = await uploaded.json();
      if (!uploaded.ok || typeof media.url !== "string" ||
          !media.url.startsWith("/shop-media/products/"))
        throw new Error(media.error || "Не вдалося завантажити фото в R2");
      const response = await fetch("/api/admin/products/"+encodeURIComponent(id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({image_url:media.url}),cache:"no-store",
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Фото завантажено в R2, але не прив'язано до товару");
      setMessage("Фотографію додано до товару. Тепер його можна публікувати.");
      setSelectedIds([]);setPreview(null);
      try {await onFinished();} catch {
        setError("Фото збережено, але каталог не оновився. Оновіть сторінку.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Помилка фото"); }
    finally {setUploadingId(null);event.target.value="";}
  }

  return <section className="admin-publish">
    <header className="admin-publish-header">
      <div><span>CATALOG RELEASE / MEDIA QUALITY</span>
        <h2>Публікація та фотографії</h2>
        <p>Публікуйте одразу кілька перевірених товарів. Товари без фотографій можна швидко знайти й доповнити.</p>
      </div>
      <button type="button" className="admin-publish-back" onClick={onClose}>← До каталогу</button>
    </header>
    <div className="admin-publish-metrics">
      <div><span>ЧЕРНЕТКИ</span><strong>{drafts.length}</strong><small>Очікують публікації</small></div>
      <div><span>БЕЗ ФОТО</span><strong>{missingPhoto.length}</strong><small>Усі статуси й бренди</small></div>
      <div><span>ГОТОВІ ЧЕРНЕТКИ</span><strong>{drafts.filter(p => Number(p.price)>0 && Boolean(p.image_url)).length}</strong><small>Мають ціну та URL фото</small></div>
    </div>
    <div className="admin-publish-tabs">
      <button type="button" className={tab==="drafts"?"is-active":""} onClick={()=>changeTab("drafts")}>Публікація чернеток</button>
      <button type="button" className={tab==="photos"?"is-active":""} onClick={()=>changeTab("photos")}>Товари без фотографій ({missingPhoto.length})</button>
    </div>
    {tab==="photos" && <>
     <AdminHistolabPhotoRepair disabled={!writable||busy} onFinished={onFinished} />
     <AdminVerifiedSupplierRepair disabled={!writable||busy} onFinished={onFinished} />
    </>}
    <div className="admin-publish-filters">
      <label><span>Бренд</span><select value={brand} onChange={e=>{setBrand(e.target.value);resetPreview();setSelectedIds([]);}}>
        <option value="all">Усі бренди</option>{brands.map(value=><option key={value} value={value}>{value}</option>)}
      </select></label>
      <label><span>Пошук товару</span><input type="search" placeholder="Назва, артикул або slug" value={search}
        onChange={e=>{setSearch(e.target.value);resetPreview();setSelectedIds([]);}} /></label>
    </div>
    {tab==="drafts" && <div className="admin-publish-toolbar">
      <div><strong>{visible.length} чернеток у вибірці</strong>
        <small>Для публікації потрібні фото та ціна. Нульові залишки залишаються незмінними.</small>
      </div>
      <div className="admin-publish-actions">
        <button type="button" onClick={()=>{setSelectedIds([...new Set(eligibleOnScreen)]);resetPreview();}}>Вибрати готові ({eligibleOnScreen.length})</button>
        <button type="button" onClick={()=>{setSelectedIds(visible.map(p=>p.id));resetPreview();}}>Усі у вибірці</button>
        <button type="button" onClick={()=>{setSelectedIds([]);resetPreview();}}>Скинути</button>
      </div>
    </div>}
    <div className="admin-publish-products">
      {visible.map(p=>{
        const hasPhoto = Boolean(String(p.image_url || "").trim());
        const ready = p.status==="draft" && Number(p.price)>0 && hasPhoto;
        return <div className="admin-publish-row" key={p.id}>
          {tab==="drafts" && <input type="checkbox" aria-label={"Обрати "+p.name}
            checked={selected.has(p.id)} onChange={e=>toggle(p.id,e.target.checked)} />}
          <div className="admin-publish-photo"><SmartProductImage src={p.image_url} alt={p.name} fallback={<span>NO PHOTO</span>}/></div>
          <div className="admin-publish-identity"><strong>{p.name}</strong>
            <small>{p.brand} · {p.sku || "Без SKU"}</small>
            {tab==="drafts"
              ? <em className={ready?"is-ready":"is-warning"}>{!hasPhoto?"Немає фото":Number(p.price)<=0?"Немає ціни":p.track_stock&&p.stock_quantity<=0?"Готовий · залишок 0":"Готовий до публікації"}</em>
              : <em className="is-warning">Відсутній URL зображення</em>}
          </div>
          <div className="admin-publish-price">
            <strong>{Number(p.price).toLocaleString("uk-UA")} грн</strong>
            <small>{p.status==="draft"?"Чернетка":p.status==="active"?"Опубліковано":"Архів"}</small>
          </div>
          <div className="admin-publish-row-buttons">
            {!hasPhoto && <label className="admin-publish-upload"><input type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={!writable||uploadingId!==null||busy} onChange={e=>{void uploadPhoto(p.id,e);}}/>
              {uploadingId===p.id?"Завантаження…":"Завантажити фото"}
            </label>}
            <button type="button" onClick={()=>onEdit(p.id)}>Редагувати ↗</button>
          </div>
        </div>;
      })}
      {!visible.length && <div className="admin-publish-empty">Товарів за цими фільтрами немає.</div>}
    </div>
    {tab==="photos" && <p className="admin-publish-note">
      Тут відображаються тільки товари без URL зображення. Для фото, які є, але розмиті або не відкриваються, замініть їх оригіналом через «Редагувати».
      Для CU SKIN можна повторити імпорт вихідного ZIP: він доповнює порожні фото без зміни цін і залишків.
    </p>}
    {tab==="drafts" && <div className="admin-publish-footer">
      <div>
        <strong>Обрано: {selectedIds.length}</strong>
        {preview ? <small>Можна опублікувати: {preview.eligibleCount} · Пропустити: {preview.skippedCount} · Із нульовим залишком: {preview.zeroStockCount}</small>
          : <small>Спочатку перевірте обрані товари, тоді підтвердьте публікацію.</small>}
      </div>
      <div className="admin-publish-actions">
        <button type="button" disabled={!selectedIds.length||busy} onClick={()=>{void makePreview();}}>{busy?"Перевіряємо…":"Перевірити перед публікацією"}</button>
        <button type="button" className="admin-publish-submit"
          disabled={!writable||!preview||previewReady===0||busy} onClick={()=>{void publish();}}>
          {busy?"Зберігаємо…":`Опублікувати ${previewReady} товарів →`}
        </button>
      </div>
    </div>}
    {preview?.rows.some(row=>!row.eligible) && <div className="admin-publish-review">
      <strong>Не будуть опубліковані:</strong>
      {preview.rows.filter(r=>!r.eligible).map(row=><p key={row.id}>{row.name} — {row.reason}</p>)}
    </div>}
    {message && <p className="admin-publish-ok" role="status">{message}</p>}
    {error && <p className="admin-publish-error" role="alert">{error}</p>}
    {!writable && <p className="admin-publish-error">D1 наразі недоступна для запису. Оновіть сторінку після перевірки сховища.</p>}
  </section>;
}
