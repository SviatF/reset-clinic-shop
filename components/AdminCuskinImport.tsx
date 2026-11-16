"use client";

import { useState, type ChangeEvent } from "react";
import { unzipSync, strFromU8 } from "fflate";

type SourceProduct = {
  sku: string; slug: string; name: string; brand: string;
  image_path: string; price: number; image_width: number; image_height: number;
  [key: string]: unknown;
};
type CuskinPackage = {
  format: string; products: SourceProduct[];
};
type PlanRow = {
  sku: string; name: string; kind: "create" | "enrich" | "skip" | "conflict";
  reason: string; needsPhoto: boolean; existingId: string | null;
};
type Preview = {
  revision: string; create: number; enrich: number; skip: number;
  conflict: number; plan: PlanRow[];
};
type Loaded = { manifest: CuskinPackage; files: Record<string,Uint8Array> };

async function requestImport(body: unknown) {
  const response = await fetch("/api/admin/products/cuskin-import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Помилка імпорту CU SKIN");
  return data;
}

async function uploadImage(photo: Uint8Array, path: string, sku: string) {
  const ext = path.split(".").at(-1)?.toLowerCase() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp" : "image/png";
  const buffer = photo.slice().buffer as ArrayBuffer;
  const form = new FormData();
  form.append("file", new File([buffer], "cuskin-" + sku + "." + ext, { type: mime }));
  const response = await fetch("/api/admin/upload", { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok || typeof body.url !== "string" ||
      !body.url.startsWith("/shop-media/products/")) {
    throw new Error(body.error || "Фото " + sku + " не завантажено в Cloudflare R2");
  }
  return body.url as string;
}

export default function AdminCuskinImport({ onFinished, disabled = false }: {
  onFinished: () => Promise<void> | void; disabled?: boolean;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);setLoaded(null);setPreview(null);setAcknowledge(false);
    setProgress("Читаємо товари й вбудовані фото…");setError("");setResult("");
    try {
      if (!file.name.endsWith(".zip") || file.size > 35 * 1024 * 1024)
        throw new Error("Завантажте підготовлений ZIP-пакет CU SKIN до 35 MB.");
      const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
      if (!files["manifest.json"]) throw new Error("У пакеті немає manifest.json");
      const manifest = JSON.parse(strFromU8(files["manifest.json"])) as CuskinPackage;
      if (manifest.format !== "reset-clinic-cuskin-import-v1" ||
          !Array.isArray(manifest.products) || manifest.products.length !== 87)
        throw new Error("Очікується перевірений пакет з 87 позиціями CU SKIN");
      const skus = new Set<string>();
      for (const row of manifest.products) {
        if (!/^300\d{3}$/.test(row.sku) || skus.has(row.sku) ||
            !/^images\/300\d{3}\.(png|jpg|jpeg|webp)$/i.test(row.image_path) ||
            !row.image_path.startsWith("images/" + row.sku + ".") ||
            !files[row.image_path] || files[row.image_path].length < 100)
          throw new Error("Некоректна фотографія або дубль SKU: " + row.sku);
        skus.add(row.sku);
      }
      const data = await requestImport({
        mode: "preview", packageFormat: manifest.format, products: manifest.products,
      }) as Preview;
      setLoaded({ manifest, files });setPreview(data);
      setProgress("Зіставлено всі 87 артикулів з актуальною базою D1");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause));setProgress(""); }
    finally { setBusy(false);event.target.value = ""; }
  }

  async function commit() {
    if (!loaded || !preview || disabled || busy) return;
    if (preview.conflict > 0 && !acknowledge) {
      setError("Підтвердьте пропуск сумнівних дублікатів перед імпортом");
      return;
    }
    const toImport = preview.create + preview.enrich;
    if (!toImport) {setError("Немає нових товарів або полів для оновлення");return;}
    if (!window.confirm(
      "Імпортувати CU SKIN: " + preview.create + " нових чернеток, " +
      preview.enrich + " доповнень існуючих позицій? " +
      "Ціни існуючих товарів, залишки, знижки та замовлення не перезаписуються. Продовжити?"
    )) return;
    setBusy(true);setError("");setResult("");
    try {
      const health = await fetch("/api/health", { cache: "no-store" });
      const status = await health.json();
      if (!health.ok || status.storage !== "d1" || !status.writable || status.media !== "r2")
        throw new Error("Для імпорту потрібні підключені Cloudflare D1 і R2");
      const rows = loaded.manifest.products.map(row => ({ ...row }));
      const bySku = new Map(rows.map(row=>[row.sku,row]));
      const required = preview.plan.filter(row =>
        (row.kind === "create" || row.kind === "enrich") && row.needsPhoto);
      let completed = 0;
      // Upload photos in small groups to avoid saturating the Worker.
      for (let i = 0; i < required.length; i += 4) {
        const batch = required.slice(i, i + 4);
        await Promise.all(batch.map(async item => {
          const row = bySku.get(item.sku)!;
          const url = await uploadImage(loaded.files[row.image_path], row.image_path, row.sku);
          row.image_url = url;
          completed += 1;
          setProgress("Завантажено " + completed + " із " + required.length + " фото в R2…");
        }));
      }
      setProgress("Зберігаємо каталог у D1 однією операцією…");
      const result = await requestImport({
        mode: "commit", packageFormat: loaded.manifest.format,
        products: rows, revision: preview.revision,
        confirmConflicts: acknowledge,
      });
      setResult("Готово: " + result.created + " нових товарів-чернеток, " +
        result.enriched + " наявних товарів доповнено. " +
        result.conflicts.length + " сумнівних збігів залишено без змін.");
      setPreview(null);setLoaded(null);
      setProgress("");
      try {await onFinished();} catch {
        setError("Імпорт у D1 збережено, але список не оновився. Оновіть сторінку.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setProgress("Після помилки можна повторно перевірити пакет. Існуючі товари не перезаписані.");
      setPreview(null); // stale token must never be replayed.
    } finally {setBusy(false);}
  }

  return <section className="admin-cuskin-import" aria-label="Імпорт CU SKIN">
    <div className="admin-cuskin-import-heading">
      <span>PRODUCT IMPORT / CU SKIN</span>
      <h3>Імпорт асортименту CU SKIN</h3>
      <p>Об'єднані два аркуші постачальника: 87 артикулів, 87 фото, РРЦ, назви, категорії, описи й склад. Навіть перші два товари мають фотографії з другого джерела всередині файлу.</p>
    </div>
    <label className="admin-cuskin-upload">
      <input type="file" accept=".zip,application/zip" disabled={busy || disabled}
        onChange={e => {void choose(e);}} />
      <span>{busy ? "Перевіряємо…" : "Вибрати пакет CU SKIN (.zip)"}</span>
      <small>Перевірка на дублікати до запису в D1</small>
    </label>
    {!!progress && <p className="admin-cuskin-progress" role="status">{progress}</p>}
    {!!error && <p className="admin-cuskin-error" role="alert">{error}</p>}
    {!!result && <p className="admin-cuskin-success" role="status">{result}</p>}
    {preview && loaded && <div className="admin-cuskin-preview">
      <div className="admin-cuskin-stats">
        <div><span>НОВІ ЧЕРНЕТКИ</span><strong>{preview.create}</strong></div>
        <div><span>ДОПОВНЕННЯ</span><strong>{preview.enrich}</strong></div>
        <div><span>ВЖЕ ГОТОВІ</span><strong>{preview.skip}</strong></div>
        <div><span>НА ПЕРЕВІРКУ</span><strong>{preview.conflict}</strong></div>
      </div>
      <p className="admin-cuskin-note">Нові позиції не публікуються до перевірки залишків. Для наявних товарів заповнюються тільки порожні поля, а їхні ціни, знижки та статуси залишаються незмінними.</p>
      <details><summary>Переглянути зіставлення всіх 87 артикулів</summary>
        <div className="admin-cuskin-rows">{preview.plan.map(row =>
          <div key={row.sku}><b>{row.sku}</b><span>{row.name}</span>
            <em className={"kind-" + row.kind}>{row.kind === "create" ? "Новий" :
              row.kind === "enrich" ? "Доповнити" : row.kind === "skip" ? "Без змін" : "Можливий дубль"}</em>
          </div>)}</div>
      </details>
      {preview.conflict > 0 && <div className="admin-cuskin-conflicts">
        <strong>Сумнівні збіги: {preview.conflict}</strong>
        {preview.plan.filter(row=>row.kind==="conflict").map(row=>
          <p key={row.sku}><b>{row.sku}</b> — {row.name}: {row.reason}</p>)}
        <label><input type="checkbox" checked={acknowledge}
          onChange={e => setAcknowledge(e.target.checked)} />
          <span>Підтверджую: пропустити конфліктні товари без створення дублікатів</span>
        </label>
      </div>}
      <button className="admin-primary" type="button"
        disabled={busy || disabled || !(preview.create + preview.enrich) ||
          (preview.conflict > 0 && !acknowledge)}
        onClick={() => {void commit();}}>Завантажити фото в R2 та імпортувати в D1 →</button>
    </div>}
  </section>;
}
