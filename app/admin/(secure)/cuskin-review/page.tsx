import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import snapshot from "@/data/cu-skin-official-snapshot.json";
import retail from "@/data/cu-skin-retail-prices-2026-11-12.json";
import { readProducts } from "@/lib/commerce-json";
import "@/app/admin-cuskin-review.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Attempt = {
  vendor_code: string;
  status: string;
  detail: string | null;
  checked_at: number;
};
type SourceItem = (typeof snapshot.products)[number];
type ReviewRow = {
  source: SourceItem;
  attempt: Attempt | undefined;
  current: Awaited<ReturnType<typeof readProducts>>[number] | undefined;
  sourcePrice: number | undefined;
};

const doneStates = new Set(["attached", "created", "kept", "already"]);
const shortReason = (detail: string | null | undefined) =>
  (detail || "Потрібна перевірка відповідності").split(" | ").slice(1).join(" | ") ||
  "Потрібна перевірка відповідності";

function PhotoPair({ row }: { row: ReviewRow }) {
  return (
    <div className="cuqa-pair">
      {/* The host is fixed in a validated, version-controlled public supplier manifest. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.source.mainImage || ""} alt={"Джерело: " + row.source.name} loading="lazy" />
      {row.current?.image_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={row.current.image_url} alt={"RESET: " + row.current.name} loading="lazy" />
        : <span className="cuqa-empty">Немає фото</span>}
    </div>
  );
}

function ReviewTable({ rows, context }: { rows: ReviewRow[]; context: "conflict" | "pricing" }) {
  return (
    <div className="cuqa-table-wrap">
      <table className="cuqa-table">
        <thead><tr>
          <th>Фото: cu.ua / RESET</th><th>Артикул і товар</th>
          <th>{context === "pricing" ? "Ціна" : "Причина"}</th><th>Переглянути</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source.sku}>
              <td><PhotoPair row={row} /></td>
              <td><b>{row.source.sku}</b><span>{row.source.name}</span>
                <small>Офіційний об'єм: {row.source.volumes.join(", ") || "не вказано"}</small>
                {row.current && <small>У RESET: {row.current.size || "об'єм не вказано"} · {row.current.status === "active" ? "опубліковано" : "чернетка"}</small>}
              </td>
              <td>{context === "pricing"
                ? <><strong>{row.current?.price ? String(row.current.price) + " ₴" : "Ціни немає"}</strong><small>Немає підтвердженої РРЦ в Excel</small></>
                : <span className="cuqa-warning">{shortReason(row.attempt?.detail)}</span>}
              </td>
              <td>
                <a href={row.source.sourceUrl} target="_blank" rel="noopener noreferrer">cu.ua</a>
                {row.current && <Link href={"/product/" + row.current.slug} target="_blank">RESET</Link>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CuskinReviewPage() {
  const products = await readProducts();
  let attempts: Attempt[] = [];
  let available = true;
  try {
    const env = getCloudflareContext().env as unknown as {
      SHOP_DB?: {
        prepare(query: string): {
          all<T>(): Promise<{ results: T[] }>;
        };
      };
    };
    if (!env.SHOP_DB) throw new Error("SHOP_DB not available");
    const data = await env.SHOP_DB.prepare(
      "SELECT vendor_code,status,detail,checked_at FROM shop_cuskin_official_sync"
    ).all<Attempt>();
    attempts = data.results || [];
  } catch {
    available = false;
  }

  const bySku = new Map<string, typeof products>();
  for (const product of products.filter((p) => p.brand === "CU SKIN" && p.sku)) {
    const sku = String(product.sku);
    bySku.set(sku, [...(bySku.get(sku) || []), product]);
  }
  const audit = new Map(attempts.map((x) => [x.vendor_code, x]));
  const prices = retail.prices_uah as Record<string, number>;
  const rows: ReviewRow[] = snapshot.products.map((source) => ({
    source,
    attempt: audit.get(source.vendorCode),
    current: bySku.get(source.sku)?.[0],
    sourcePrice: prices[source.sku],
  }));
  const conflicts = rows.filter((r) =>
    r.attempt?.status === "conflict" || r.attempt?.status === "error" ||
    (bySku.get(r.source.sku)?.length || 0) > 1
  );
  const missingPrice = rows.filter((r) => !(Number(r.sourcePrice) > 0));
  const pending = rows.filter((r) => !r.attempt);
  const completed = rows.filter((r) => doneStates.has(r.attempt?.status || ""));
  const officialPhotos = products.filter((p) => p.brand === "CU SKIN" &&
    String(p.image_url || "").includes("/products/cu-skin-official/")).length;
  const sourceSkus = new Set(rows.map((r) => r.source.sku));
  const legacy = products.filter((p) => p.brand === "CU SKIN" && !sourceSkus.has(p.sku || ""));
  const percent = Math.round(completed.length / rows.length * 100);

  return (
    <div className="cuqa">
      <div className="cuqa-topline"><span>RESET COMMERCE / АУДИТ КАТАЛОГУ</span><Link href="/admin/products">Відкрити редактор товарів</Link></div>
      <header className="cuqa-hero">
        <div>
          <p className="cuqa-kicker">CU SKIN · ОФІЦІЙНИЙ КАТАЛОГ</p>
          <h1>Контроль фотографій і товарів</h1>
          <p>Зіставлення за артикулами cu.ua, якість фото та розбіжності з прайсом Excel. Жодних автоматичних видалень або змін цін на цій сторінці.</p>
        </div>
        <a className="cuqa-main-link" href="/catalog?brand=CU+SKIN" target="_blank" rel="noopener noreferrer">Переглянути CU SKIN у магазині ↗</a>
      </header>
      {!available && <p className="cuqa-alert">Cloudflare D1 зараз недоступна для діагностики: показано дані товарів, але статус імпорту може бути неповним.</p>}
      <section className="cuqa-metrics" aria-label="Статус імпорту CU SKIN">
        <div><span>Оброблено</span><strong>{completed.length} / {rows.length}</strong><small>{percent}% перевіреного каталогу</small></div>
        <div><span>Офіційні фото в D1</span><strong>{officialPhotos}</strong><small>Підтверджені cu.ua</small></div>
        <div><span>Конфлікти / помилки</span><strong>{conflicts.length}</strong><small>Не перезаписуються автоматично</small></div>
        <div><span>Без ціни з Excel</span><strong>{missingPrice.length}</strong><small>Залишаються чернетками</small></div>
      </section>
      <div className="cuqa-progress" role="progressbar" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={rows.length}>
        <span style={{ width: percent + "%" }} />
      </div>
      <section className="cuqa-section">
        <div className="cuqa-section-head"><div><h2>Потрібна перевірка відповідності</h2><p>Перевір лише артикул, об'єм, SPF, концентрацію або відтінок за двома картками.</p></div><strong>{conflicts.length}</strong></div>
        {conflicts.length
          ? <ReviewTable rows={conflicts} context="conflict" />
          : <div className="cuqa-clear">Невирішених конфліктів або помилок немає.</div>}
      </section>
      <section className="cuqa-section">
        <details open={false}>
          <summary><span><b>Товари без підтвердженої ціни</b><small>Є на cu.ua, але без РРЦ у наданому Excel. Їх не можна публікувати з вигаданою ціною.</small></span><strong>{missingPrice.length}</strong></summary>
          <ReviewTable rows={missingPrice} context="pricing" />
        </details>
      </section>
      <section className="cuqa-section">
        <details>
          <summary><span><b>Стан автоматичної обробки</b><small>Імпорт виконується Cloudflare Worker без ручного підтвердження кожної фотографії.</small></span><strong>{pending.length} у черзі</strong></summary>
          <p className="cuqa-info">Завершених позицій: {completed.length}. У черзі: {pending.length}. Проблемних: {conflicts.length}.</p>
          {pending.length > 0 && <div className="cuqa-pending">{pending.map((r) => <span key={r.source.sku}>{r.source.sku}</span>)}</div>}
        </details>
      </section>
      {legacy.length > 0 && <section className="cuqa-section"><details>
        <summary><span><b>Застарілі записи, яких немає в офіційному переліку</b><small>Не видалені — збережено безпеку каталогу та історії замовлень.</small></span><strong>{legacy.length}</strong></summary>
        <div className="cuqa-legacy">{legacy.map((p) => <p key={p.id}><strong>{p.sku || "Без артикула"}</strong> · {p.name} · {p.status}</p>)}</div>
      </details></section>}
    </div>
  );
}
