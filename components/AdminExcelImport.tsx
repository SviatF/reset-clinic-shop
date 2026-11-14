"use client";

import { useState, type ChangeEvent } from "react";
import { parseSupplierWorkbook, type ExcelDraft, type PreparedPhoto } from "@/lib/excel-client";

type Prepared = { products: ExcelDraft[]; photos: PreparedPhoto[]; warnings: string[] };
type ExistingProduct = {
  id: string; slug: string; sku: string | null; brand: string; name: string;
  size: string | null; image_url: string | null;
};
type Plan = {
  recover: Array<{ row: ExcelDraft; existing: ExistingProduct }>;
  create: ExcelDraft[];
  alreadyHavePhoto: number;
  conflicts: string[];
};

function normalized(value: string) {
  return value.toLocaleLowerCase("uk").replace(/[^a-zа-яіїєґ0-9]+/giu, " ").trim();
}
function sizeNumber(value: string | null) {
  return value?.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") || "";
}
function sameIdentity(row: ExcelDraft, existing: ExistingProduct) {
  if (!existing.sku || row.sku.toUpperCase() !== existing.sku.toUpperCase()) return false;
  if (normalized(row.brand) !== normalized(existing.brand)) return false;
  const a = sizeNumber(row.size), b = sizeNumber(existing.size);
  if (a && b && a !== b) return false;
  const aName = normalized(row.name), bName = normalized(existing.name);
  if (aName === bName || aName.includes(bName) || bName.includes(aName)) return true;
  const tokensA = new Set(aName.split(" ").filter(word => word.length >= 4));
  const tokensB = new Set(bName.split(" ").filter(word => word.length >= 4));
  const common = [...tokensA].filter(token => tokensB.has(token)).length;
  return Math.min(tokensA.size, tokensB.size) > 0 && common / Math.min(tokensA.size, tokensB.size) >= 0.6;
}
function makePlan(rows: ExcelDraft[], existing: ExistingProduct[]): Plan {
  const plan: Plan = { recover: [], create: [], alreadyHavePhoto: 0, conflicts: [] };
  for (const row of rows) {
    const withSku = existing.filter(item => item.sku?.toUpperCase() === row.sku.toUpperCase());
    if (withSku.length > 1 || (withSku.length === 1 && !sameIdentity(row, withSku[0]))) {
      plan.conflicts.push(row.sku + " — SKU вже зайнятий іншим товаром або відрізняється назва/об’єм");
      continue;
    }
    if (withSku.length === 1) {
      if (withSku[0].image_url) plan.alreadyHavePhoto += 1;
      else plan.recover.push({ row, existing: withSku[0] });
      continue;
    }
    if (existing.some(item => item.slug === row.slug)) {
      plan.conflicts.push(row.slug + " — slug зайнятий без збігу SKU");
      continue;
    }
    plan.create.push(row);
  }
  return plan;
}

async function loadExisting(): Promise<ExistingProduct[]> {
  const response = await fetch("/api/admin/products", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !Array.isArray(body.products)) throw new Error(body.error || "Не вдалося перевірити поточний каталог");
  if (!body.writable) throw new Error("Сховище товарів працює лише на читання. Підключіть D1 для відновлення фото.");
  return body.products;
}
async function optimized(file: File): Promise<File> {
  if (file.size <= 8 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступний");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.87));
  if (!blob) throw new Error("Не вдалося оптимізувати " + file.name);
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}
async function uploadPhoto(photo: PreparedPhoto) {
  const file = await optimized(photo.file);
  if (file.size > 10 * 1024 * 1024) throw new Error("Фото перевищує 10 MB: " + photo.slug);
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok || typeof body.url !== "string") throw new Error(body.error || "Не вдалося завантажити " + photo.slug);
  // The upload endpoint returns an owned, same-origin R2 URL, never an external image.
  if (!body.url.startsWith("/shop-media/products/")) throw new Error("Некоректна адреса збереженого фото: " + photo.slug);
  return body.url as string;
}

export default function AdminExcelImport({
  onFinished, disabled = false,
}: { onFinished: () => Promise<void> | void; disabled?: boolean }) {
  const [ready, setReady] = useState<Prepared | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setProgress("Перевіряємо Excel і поточні SKU"); setReady(null); setPlan(null);
    try {
      const parsed = await parseSupplierWorkbook(file);
      const existing = await loadExisting();
      const nextPlan = makePlan(parsed.products, existing);
      setReady(parsed);
      setPlan(nextPlan);
      setProgress("Знайдено " + parsed.products.length + " товарів та " + parsed.photos.length + " фото");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : String(ex)); setProgress("");
    } finally {
      setBusy(false);
      // Re-selecting the same workbook should run the check again.
      event.target.value = "";
    }
  }

  async function commit() {
    if (!ready || !plan || busy || disabled) return;
    const count = plan.recover.length + plan.create.length;
    if (!count || !confirm(
      "Завантажити " + count + " фотографій у R2 та прив'язати до відповідних SKU? " +
      "Існуючі ціни, залишки, назви й статуси не зміняться. Нові товари залишаться чернетками."
    )) return;

    setBusy(true); setError("");
    let fixed = 0;
    try {
      const health = await fetch("/api/health", { cache: "no-store" });
      const healthBody = await health.json();
      if (!health.ok || healthBody.storage !== "d1" || !healthBody.writable || healthBody.media !== "r2") {
        throw new Error("Для надійного збереження фото потрібні активні Cloudflare D1 та R2. Перевірте SHOP_STORAGE_BACKEND, SHOP_PRODUCTS_BACKEND і SHOP_MEDIA_BACKEND.");
      }
      const currentPlan = makePlan(ready.products, await loadExisting());
      const photoMap = new Map(ready.photos.map(photo => [photo.slug, photo]));
      // First repair products already published. Only the image_url field is changed.
      for (const { row, existing } of currentPlan.recover) {
        const photo = photoMap.get(row.slug);
        if (!photo) throw new Error("Не знайдено фото для " + row.sku);
        setProgress("Відновлюємо фото " + (fixed + 1) + " із " + currentPlan.recover.length + ": " + row.sku);
        const url = await uploadPhoto(photo);
        const response = await fetch("/api/admin/products/" + encodeURIComponent(existing.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Не вдалося прив'язати фото до SKU " + row.sku);
        fixed++;
      }

      // Import truly new rows only. Unlike the old importer, existing products
      // are never skipped before their missing photo has been recovered.
      if (currentPlan.create.length > 0) {
        const imported: ExcelDraft[] = [];
        for (const row of currentPlan.create) {
          const photo = photoMap.get(row.slug);
          if (!photo) throw new Error("Не знайдено фото для " + row.sku);
          setProgress("Фото для нової чернетки: " + row.sku);
          const image_url = await uploadPhoto(photo);
          imported.push({ ...row, image_url });
        }
        const response = await fetch("/api/admin/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: imported, preview: false }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Не вдалося створити чернетки");
        setProgress("Відновлено " + fixed + " фото; додано " + body.created_count + " чернеток.");
      } else {
        setProgress("Відновлено " + fixed + " фото. Дані існуючих товарів збережені.");
      }
      setReady(null); setPlan(null);
      await onFinished();
    } catch (ex) {
      setError((ex instanceof Error ? ex.message : String(ex)) +
        (fixed ? " (Уже відновлено " + fixed + " фото; повторний імпорт пропустить їх.)" : ""));
    } finally { setBusy(false); }
  }

  return <section className="admin-form-section" style={{ marginBottom: 32 }}>
    <h3>Відновлення фото Dermafirm / Braderm з Excel</h3>
    <p>Визначає існуючі товари за SKU і брендом, звіряє назву та об’єм, завантажує вкладені фото в R2 і заповнює лише порожні image_url. Ціни, залишки й статуси не змінюються. Нові позиції імпортуються тільки як чернетки.</p>
    <label className="admin-upload">
      <input disabled={busy || disabled} type="file" accept=".xlsx" onChange={load} />
      <span>{busy ? "Обробка…" : "Вибрати Excel постачальника (.xlsx)"}</span>
    </label>
    {progress && <p role="status" style={{ marginTop: 12 }}>{progress}</p>}
    {error && <p role="alert" style={{ color: "#a11" }}>{error}</p>}
    {ready && plan && <div style={{ marginTop: 14 }}>
      <p><b>Знайдено: {ready.products.length} товарів / {ready.photos.length} фотографій.</b></p>
      <p>Відновити фото для існуючих товарів: <b>{plan.recover.length}</b>.
        Вже мають фото: <b>{plan.alreadyHavePhoto}</b>.
        Нові чернетки: <b>{plan.create.length}</b>.</p>
      {plan.conflicts.length > 0 && <details open>
        <summary>Неоднозначні SKU, пропущено ({plan.conflicts.length})</summary>
        <ul>{plan.conflicts.map(value => <li key={value}>{value}</li>)}</ul>
      </details>}
      {ready.warnings.length > 0 && <details>
        <summary>Попередження Excel ({ready.warnings.length})</summary>
        <ul>{ready.warnings.map((value, index) => <li key={index}>{value}</li>)}</ul>
      </details>}
      <button className="admin-primary" disabled={busy || disabled || !(plan.recover.length + plan.create.length)}
        type="button" onClick={commit}>Відновити фотографії для товарів</button>
    </div>}
  </section>;
}
