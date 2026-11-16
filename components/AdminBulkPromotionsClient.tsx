"use client";

import { useMemo, useState } from "react";

type ProductSummary = {
  id: string; name: string; brand: string; category: string;
  product_line?: string | null; status: string;
};
type Category = { name: string; slug: string; parent_slug: string | null; status: string };
type Filters = {
  brand: string; category: string; subcategory: string; productLine: string;
  status: string; query: string; allProducts: boolean;
};
type PreviewRow = {
  id: string; name: string; brand: string; sku: string; status: string;
  originalPrice: number; currentPrice: number; proposedPrice: number;
  savedAmount: number; eligible: boolean; reason: string | null;
};
type Preview = {
  token: string; matchedCount: number; eligibleCount: number;
  skippedCount: number; rows: PreviewRow[];
};
const DEFAULT_FILTERS: Filters = {
  brand: "", category: "", subcategory: "", productLine: "",
  status: "active", query: "", allProducts: false,
};
const categoriesLabel: Record<string, string> = {
  face: "Обличчя", body: "Тіло", hair: "Волосся", other: "Інше",
};
const money = (value: number) => new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);

export default function AdminBulkPromotionsClient({
  products, categories, writable, onClose, onFinished, initialBrand = "all",
}: {
  products: ProductSummary[];
  categories: Category[];
  writable: boolean;
  initialBrand?: string;
  onClose: () => void;
  onFinished: () => Promise<void>;
}) {
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS, brand: initialBrand === "all" ? "" : initialBrand,
  });
  const [action, setAction] = useState<"apply" | "remove">("apply");
  const [percent, setPercent] = useState("20");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "uk")), [products]);
  const productLines = useMemo(() =>
    [...new Set(products.filter(p =>
      (!filters.brand || p.brand === filters.brand) &&
      (!filters.category || p.category === filters.category))
      .map(p => p.product_line || "").filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "uk")), [products, filters.brand, filters.category]);
  const subcategories = useMemo(() => categories.filter(c =>
    c.parent_slug === filters.category && c.status === "active"), [categories, filters.category]);
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
  const includedCount = preview ? preview.rows.filter(row => row.eligible && !excluded.has(row.id)).length : 0;
  const discountedTotal = preview ? preview.rows
    .filter(row => row.eligible && !excluded.has(row.id))
    .reduce((total, row) => total + row.savedAmount, 0) : 0;

  function resetPreview() {
    setPreview(null);
    setExcludedIds([]);
    setMessage("");
    setError("");
  }
  function changeFilter<K extends keyof Filters>(name: K, value: Filters[K]) {
    setFilters(current => ({
      ...current, [name]: value,
      ...(name === "category" ? { subcategory: "", productLine: "" } : {}),
      ...(name === "brand" ? { productLine: "" } : {}),
    }));
    resetPreview();
  }
  function selectionInput(mode: "preview" | "apply") {
    return {
      mode, filters, action,
      percent: action === "apply" ? Number(percent) : 0,
      overwriteExisting: action === "apply" && overwriteExisting,
    };
  }
  async function getPreview() {
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(null);
    setExcludedIds([]);
    try {
      const response = await fetch("/api/admin/products/bulk-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(selectionInput("preview")),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не вдалося сформувати попередній перегляд");
      setPreview(data as Preview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Помилка попереднього перегляду");
    } finally {
      setBusy(false);
    }
  }
  function toggleRow(id: string, checked: boolean) {
    setExcludedIds(current => checked ? current.filter(value => value !== id)
      : [...current.filter(value => value !== id), id]);
  }
  async function apply() {
    if (!preview || busy || !includedCount || !writable) return;
    const description = action === "apply"
      ? `Встановити знижку ${percent}% для ${includedCount} товарів?`
      : `Прибрати знижку з ${includedCount} товарів?`;
    if (!window.confirm(`${description}\n\nУсі ціни оновляться в магазині відразу після збереження. Цю дію не можна скасувати однією кнопкою. Продовжити?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/products/bulk-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ ...selectionInput("apply"), token: preview.token, excludedIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setPreview(null);
        throw new Error(data.error || "Не вдалося застосувати масову операцію");
      }
      setPreview(null);
      setExcludedIds([]);
      setMessage(`Готово. ${action === "apply" ? "Знижки встановлено" : "Знижки вимкнено"} для ${data.updatedCount} товарів. Інші позиції не змінено.`);
      try {
        await onFinished();
      } catch {
        setError("Зміни збережено в базі, але оновити каталог не вдалося. Перезавантажте сторінку.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Помилка збереження");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-bulk" aria-label="Масове керування знижками">
      <header className="admin-bulk-heading">
        <div>
          <span className="admin-bulk-overline">PROMOTION STUDIO / RESET COMMERCE</span>
          <h2>Масові акції <span>за один крок</span></h2>
          <p>Задайте одну знижку для бренду, категорії чи вибраної групи товарів. Перед застосуванням перевірте кожну ціну.</p>
        </div>
        <button type="button" className="admin-bulk-back" onClick={onClose}>← До каталогу</button>
      </header>

      <div className="admin-bulk-steps" aria-label="Етапи налаштування">
        <span><b>01</b> Обрати товари</span><span><b>02</b> Перевірити ціни</span><span><b>03</b> Застосувати</span>
      </div>

      <div className="admin-bulk-layout">
        <div className="admin-bulk-settings">
          <div className="admin-bulk-section-head"><span>01 / ВІДБІР ТОВАРІВ</span><h3>Кому призначена акція?</h3></div>
          <div className="admin-bulk-filter-grid">
            <label><span>Бренд</span><select value={filters.brand} disabled={busy}
              onChange={e => changeFilter("brand", e.target.value)}>
              <option value="">Усі бренди</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select></label>
            <label><span>Категорія</span><select value={filters.category} disabled={busy}
              onChange={e => changeFilter("category", e.target.value)}>
              <option value="">Усі категорії</option>
              {Object.entries(categoriesLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label><span>Підкатегорія</span><select value={filters.subcategory} disabled={busy || !filters.category}
              onChange={e => changeFilter("subcategory", e.target.value)}>
              <option value="">Усі підкатегорії</option>
              {subcategories.map(category => <option key={category.parent_slug + category.slug} value={category.slug}>{category.name}</option>)}
            </select></label>
            <label><span>Продуктова лінійка</span><select value={filters.productLine} disabled={busy}
              onChange={e => changeFilter("productLine", e.target.value)}>
              <option value="">Усі лінійки</option>
              {productLines.map(line => <option key={line} value={line}>{line}</option>)}
            </select></label>
            <label><span>Статус товарів</span><select value={filters.status} disabled={busy}
              onChange={e => changeFilter("status", e.target.value)}>
              <option value="active">Тільки опубліковані</option>
              <option value="draft">Тільки чернетки</option>
              <option value="archived">Тільки архівні</option>
              <option value="all">Усі статуси</option>
            </select></label>
            <label><span>Пошук за назвою / SKU</span>
              <input type="search" value={filters.query} disabled={busy} placeholder="Необов'язково"
                onChange={e => changeFilter("query", e.target.value)} />
            </label>
          </div>
          {!filters.brand && !filters.category && !filters.productLine && !filters.query && (
            <label className="admin-bulk-all-catalog">
              <input type="checkbox" checked={filters.allProducts} disabled={busy}
                onChange={e => changeFilter("allProducts", e.target.checked)} />
              <span>Свідомо обрати весь каталог з указаним статусом</span>
            </label>
          )}
          <div className="admin-bulk-section-head admin-bulk-action-head"><span>02 / ПРАВИЛО АКЦІЇ</span><h3>Що змінюємо?</h3></div>
          <div className="admin-bulk-action-choices">
            <button type="button" aria-pressed={action === "apply"} className={action === "apply" ? "is-active" : ""} disabled={busy}
              onClick={() => { setAction("apply"); resetPreview(); }}>Встановити знижку</button>
            <button type="button" aria-pressed={action === "remove"} className={action === "remove" ? "is-active" : ""} disabled={busy}
              onClick={() => { setAction("remove"); resetPreview(); }}>Вимкнути знижки</button>
          </div>
          {action === "apply" ? <>
            <label className="admin-bulk-percent"><span>Єдина знижка для вибраних товарів</span>
              <div><input type="number" min="0.1" max="99.9" step="0.01" value={percent} disabled={busy}
                onChange={e => { setPercent(e.target.value); resetPreview(); }} /><b>%</b></div>
            </label>
            <label className="admin-bulk-policy"><input type="checkbox" checked={overwriteExisting} disabled={busy}
              onChange={e => { setOverwriteExisting(e.target.checked); resetPreview(); }} />
              <span><strong>Замінити наявні індивідуальні знижки</strong><small>За замовчуванням вони захищені: товари з уже встановленою знижкою пропускаються.</small></span>
            </label>
          </> : <div className="admin-bulk-removal-note">Прибрати акційні ціни лише у відібраних товарів. Звичайні ціни залишаться без змін.</div>}

          <button type="button" className="admin-bulk-preview-button" disabled={busy}
            onClick={() => { void getPreview(); }}>
            {busy ? "Перевіряємо товари…" : "Показати товари та нові ціни →"}
          </button>
          <p className="admin-bulk-footnote">Натискання цієї кнопки нічого не змінює у магазині.</p>
        </div>

        <div className="admin-bulk-results">
          <div className="admin-bulk-results-head"><div><span>03 / ПЕРЕГЛЯД ПЕРЕД ЗМІНАМИ</span><h3>Що побачать покупці?</h3></div><span className="admin-bulk-live-pill">LIVE PREVIEW</span></div>

          {!preview && <div className="admin-bulk-empty">
            <div className="admin-bulk-empty-symbol">%</div>
            <strong>Спочатку оберіть умови</strong>
            <p>Тут відобразиться точний список товарів, їхні старі та нові ціни. Ви зможете виключити будь-який товар із масової акції.</p>
          </div>}

          {preview && <>
            <div className="admin-bulk-kpis">
              <div><span>Знайдено</span><strong>{preview.matchedCount}</strong></div>
              <div><span>Можна змінити</span><strong>{preview.eligibleCount}</strong></div>
              <div><span>Пропущено</span><strong>{preview.skippedCount}</strong></div>
            </div>
            <div className="admin-bulk-selection">
              <div><strong>Обрано {includedCount} товарів</strong><small>Неактивні у попередньому перегляді позиції автоматично пропущено</small></div>
              <div><button type="button" onClick={() => setExcludedIds([])} disabled={busy}>Усі</button>
                <button type="button" onClick={() => setExcludedIds(preview.rows.filter(row => row.eligible).map(row => row.id))} disabled={busy}>Жодного</button></div>
            </div>
            <div className="admin-bulk-rows" role="table" aria-label="Перегляд змін цін">
              <div className="admin-bulk-row-heading" role="row"><span>ТОВАР</span><span>ЗАРАЗ</span><span>ПІСЛЯ</span></div>
              {preview.rows.map(row => <label key={row.id}
                  className={`admin-bulk-row ${!row.eligible ? "is-skipped" : excluded.has(row.id) ? "is-excluded" : ""}`}>
                <span className="admin-bulk-product-name">
                  <input type="checkbox" checked={row.eligible && !excluded.has(row.id)} disabled={busy || !row.eligible}
                    onChange={e => toggleRow(row.id, e.target.checked)} />
                  <span><strong>{row.name}</strong><small>{row.brand}{row.sku ? " · " + row.sku : ""}</small>
                    {!row.eligible && <em>{row.reason}</em>}</span>
                </span>
                <span className="admin-bulk-oldprice">{money(row.currentPrice)} грн</span>
                <span className="admin-bulk-newprice">{row.eligible && !excluded.has(row.id) ?
                  <strong>{money(row.proposedPrice)} грн</strong> : <span>—</span>}</span>
              </label>)}
              {preview.rows.length === 0 && <div className="admin-bulk-zero">За заданими фільтрами товарів не знайдено.</div>}
            </div>
            <div className="admin-bulk-commitbar">
              <div><span>{includedCount} товарів до зміни</span><strong>{action === "apply" ?
                `Одна знижка −${percent}%` : "Видалення акційних цін"}</strong>
                {action === "apply" && includedCount > 0 && <small>Сума економії за 1 шт. кожного товару: {money(discountedTotal)} грн</small>}
              </div>
              <button type="button" className="admin-bulk-apply" disabled={!writable || busy || includedCount === 0}
                onClick={() => { void apply(); }}>{busy ? "Зберігаємо…" : action === "apply" ? "Застосувати до вибраних →" : "Вимкнути для вибраних →"}</button>
            </div>
          </>}
        </div>
      </div>
      {message && <div className="admin-bulk-message" role="status">{message}</div>}
      {error && <div className="admin-bulk-error" role="alert">{error}</div>}
      {!writable && <p className="admin-bulk-error">Сховище недоступне для запису. Після підключення D1 оновіть сторінку.</p>}
    </section>
  );
}
