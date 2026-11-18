import Link from "next/link";
import { readProducts } from "@/lib/commerce-json";
import { getInventoryState } from "@/lib/inventory-state";
import "@/app/admin-inventory-review.css";

export const dynamic="force-dynamic";
export const revalidate=0;
type Item=Awaited<ReturnType<typeof readProducts>>[number];

function hrefToEdit(item:Item){
  const params=new URLSearchParams();
  params.set("q",item.sku||item.slug);
  params.set("status",item.status);
  params.set("brand",item.brand);
  return "/admin/products?"+params.toString();
}
function StatusTable({rows,showStock=false}:{rows:Item[];showStock?:boolean}){
  if(!rows.length)return <div className="ir-empty">Немає товарів у цій категорії.</div>;
  return <div className="ir-table-scroll"><table className="ir-table">
    <thead><tr><th>Фото</th><th>Бренд / товар</th><th>Ціна</th><th>{showStock?"Залишок":"Публікація"}</th><th>Дія</th></tr></thead>
    <tbody>{rows.map(p=><tr key={p.id}>
      <td>{p.image_url
        ? /* eslint-disable-next-line @next/next/no-img-element */
          <img className="ir-img" src={p.image_url} alt={p.name} loading="lazy"/>
        : <span className="ir-no-photo">Без фото</span>}
      </td>
      <td><strong>{p.brand}</strong><div className="ir-product-name">{p.name}</div><small>{p.sku||p.slug}</small></td>
      <td>{Number(p.price)>0?Number(p.price).toLocaleString("uk-UA")+" ₴":"Ціна уточнюється"}</td>
      <td>{showStock
        ? (p.inventory_status==="out_of_stock"?"Немає · підтверджено":p.track_stock?Number(p.stock_quantity)>0?p.stock_quantity+" шт.":"Не підтверджено": "Без кількісного обліку")
        : p.status==="draft"?"Чернетка":"Опубліковано"}</td>
      <td><Link href={hrefToEdit(p)}>Редагувати ↗</Link></td>
    </tr>)}</tbody>
  </table></div>;
}
export default async function InventoryReviewPage(){
  const products=await readProducts();
  const drafts=products.filter(p=>p.status==="draft").sort((a,b)=>a.brand.localeCompare(b.brand,"uk")||a.name.localeCompare(b.name,"uk"));
  const withoutPhoto=products.filter(p=>!p.image_url);
  const stockUnknown=products.filter(p=>p.status==="active"&&getInventoryState({
    brand:p.brand,price:p.price,track_stock:p.track_stock,stock_quantity:p.stock_quantity,inventory_status:p.inventory_status
  })==="unconfirmed");
  const publishedMissingPhoto=withoutPhoto.filter(p=>p.status==="active");
  const perBrand=[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,"uk")).map(brand=>{
    const a=products.filter(p=>p.brand===brand);
    return {brand,total:a.length,active:a.filter(p=>p.status==="active").length,
      draft:a.filter(p=>p.status==="draft").length,
      withoutPhoto:a.filter(p=>!p.image_url).length,
      availabilityUnconfirmed:stockUnknown.filter(p=>p.brand===brand).length};
  });
  return <section className="ir-shell">
    <div className="ir-top"><span>RESET COMMERCE / АУДИТ СКЛАДУ</span><Link href="/admin/products">Усі товари ↗</Link></div>
    <header className="ir-header"><div><p>Живі дані Cloudflare D1</p><h1>Чернетки, фотографії та наявність</h1>
      <span>Показуємо фактичний стан товарів, а не початкові значення імпорту.</span></div>
      <Link className="ir-primary" href="/catalog" target="_blank">Відкрити вітрину ↗</Link></header>
    <div className="ir-kpis">
      <div><small>Чернетки</small><strong>{drafts.length}</strong><span>Не видно в публічному каталозі</span></div>
      <div><small>Без фото · всі статуси</small><strong>{withoutPhoto.length}</strong><span>Зокрема активних: {publishedMissingPhoto.length}</span></div>
      <div><small>CU SKIN · наявність не підтверджено</small><strong>{stockUnknown.filter(p=>p.brand==="CU SKIN").length}</strong><span>Не означає, що товар закінчився</span></div>
      <div><small>Чернетки з ціною</small><strong>{drafts.filter(p=>Number(p.price)>0).length}</strong><span>Потребують перевірки перед публікацією</span></div>
    </div>
    <div className="ir-block"><div className="ir-block-title"><div><h2>Розподіл за брендами</h2><p>Кількість записів, чернеток, фото та непідтверджених залишків</p></div></div>
      <div className="ir-table-scroll"><table className="ir-table ir-summary"><thead><tr><th>Бренд</th><th>Усього</th><th>Опубліковано</th><th>Чернеток</th><th>Без фото</th><th>Уточнити наявність</th></tr></thead>
       <tbody>{perBrand.map(x=><tr key={x.brand}><td><strong>{x.brand}</strong></td><td>{x.total}</td><td>{x.active}</td><td>{x.draft}</td><td>{x.withoutPhoto}</td><td>{x.availabilityUnconfirmed}</td></tr>)}</tbody>
      </table></div>
    </div>
    <div className="ir-block"><details open><summary><div><h2>Чернетки</h2><p>Ці товари ще не опубліковані. Перевір фото, ціну й фасування.</p></div><strong>{drafts.length}</strong></summary>
      <StatusTable rows={drafts}/></details></div>
    <div className="ir-block"><details><summary><div><h2>Картки без фотографій</h2><p>Розділено за дійсною наявністю зображення після підключення локальних фото.</p></div><strong>{withoutPhoto.length}</strong></summary>
      <StatusTable rows={withoutPhoto}/></details></div>
    <div className="ir-block"><details><summary><div><h2>CU SKIN · непідтверджена наявність</h2><p>Нульовий стартовий залишок імпорту не означає підтверджене «немає в наявності».</p></div><strong>{stockUnknown.filter(p=>p.brand==="CU SKIN").length}</strong></summary>
      <StatusTable rows={stockUnknown.filter(p=>p.brand==="CU SKIN")} showStock/></details></div>
    <p className="ir-note">Щоб увімкнути замовлення, внеси підтверджений залишок товару або керуй обліком у його редакторі. Записи D1 та реальні складські кількості автоматично не змінюються.</p>
  </section>;
}
