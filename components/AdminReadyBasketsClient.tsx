"use client";
import ArrowUpRight from "@/components/ArrowUpRight";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import SmartProductImage from "@/components/SmartProductImage";
import { SKIN_CATEGORIES, CONCERN_CATEGORIES, READY_BASKET_CATEGORIES } from "@/lib/ready-basket-taxonomy";

type CatalogProduct = {
 slug: string; name: string; brand: string; price: number; status: string;
 imageUrl: string | null; stockQuantity: number; trackStock: boolean; inventoryStatus: string;
};
type BasketItem = { slug: string; qty: number };
type Basket = {
 id: string; slug: string; title: string; concern: string; description: string;
 imageUrl: string | null; status: "draft" | "published"; sortOrder: number;
 items: BasketItem[]; categories: string[]; calculated?: { total: number; count: number; available: boolean };
};
type Form = Omit<Basket, "id" | "calculated"> & { id: string };
const empty: Form = { id: "", slug: "", title: "", concern: "", description: "",
 imageUrl: null, status: "draft", sortOrder: 50, items: [], categories: [] };
const currency = (n: number) => new Intl.NumberFormat("uk-UA",{ style:"currency",currency:"UAH",maximumFractionDigits:2 }).format(n);
const translit: Record<string,string> = {
 а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",ї:"yi",
 й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",
 ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya",ы:"y",э:"e",ъ:"",ё:"yo"
};
function slugify(value: string) {
 return Array.from(value.toLowerCase()).map(letter => translit[letter] ?? letter)
  .join("").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,110);
}
export default function AdminReadyBasketsClient() {
 const [baskets, setBaskets] = useState<Basket[]>([]);
 const [products, setProducts] = useState<CatalogProduct[]>([]);
 const [form, setForm] = useState<Form>(empty);
 const [query,setQuery] = useState("");
 const [writable,setWritable] = useState(false);
 const [storageReason,setStorageReason] = useState<string | null>(null);
 const [busy,setBusy] = useState(false);
 const [loading,setLoading] = useState(true);
 const [message,setMessage] = useState("");
 const [imageUploading,setImageUploading] = useState(false);
 const [categoryUploading,setCategoryUploading] = useState<string | null>(null);
 const [categoryImages,setCategoryImages] = useState<Record<string,string>>({});
 const bySlug = useMemo(() => new Map(products.map(p => [p.slug,p])),[products]);
 const selected = form.items.map(x => ({ ...x, product: bySlug.get(x.slug) })).filter(x => x.product);
 const sum = selected.reduce((value,x) => value + (x.product?.price || 0)*x.qty,0);
 const ready = selected.length>0 && selected.every(x=>x.product?.status==="active" && x.product.price>0
   && x.product.inventoryStatus!=="out_of_stock" && x.product.inventoryStatus!=="unknown"
   && (!x.product.trackStock || x.product.stockQuantity>=x.qty));
 const filtered = products.filter(product =>
    !form.items.some(row=>row.slug===product.slug) &&
    [product.name, product.brand, product.slug].join(" ").toLocaleLowerCase("uk").includes(query.toLocaleLowerCase("uk").trim())
 ).slice(0,14);
 const refresh = useCallback(async () => {
  const res = await fetch("/api/admin/ready-baskets",{cache:"no-store"});
  const j = await res.json();
  if(!res.ok) throw new Error(j.error || "Не вдалося прочитати D1");
  setBaskets(j.baskets || []);
  setProducts(j.products || []);
  setCategoryImages(j.categoryImages || {});
  setWritable(Boolean(j.writable));
  setStorageReason(j.storageReason || null);
  setLoading(false);
 },[]);
 useEffect(()=>{ refresh().catch(error=>{setMessage(error.message);setLoading(false)}) },[refresh]);
 function select(basket: Basket) {
  setForm({
   id:basket.id,slug:basket.slug,title:basket.title,concern:basket.concern,description:basket.description,
   imageUrl:basket.imageUrl,status:basket.status,sortOrder:basket.sortOrder,items:basket.items.map(x=>({...x})),categories:[...(basket.categories||[])]
  });
  setQuery("");
  setMessage("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function newBasket() { setForm({...empty,items:[]});setQuery("");setMessage(""); }
 function update<K extends keyof Form>(key:K,value:Form[K]) {setForm(prev=>({...prev,[key]:value}));}
 function toggleCategory(key:string) {
  setForm(prev=>({...prev,categories:prev.categories.includes(key)
   ? prev.categories.filter(x=>x!==key) : [...prev.categories,key]}));
 }
 async function uploadCategory(key:string,file?:File,remove=false) {
  if(!file&&!remove)return;
  setCategoryUploading(key);setMessage("");
  try {
   let url:string|null=null;
   if(!remove&&file){
    const fd=new FormData();fd.append("file",file);
    const upload=await fetch("/api/admin/upload",{method:"POST",body:fd});
    const u=await upload.json();
    if(!upload.ok)throw new Error(u.error||"Не вдалося завантажити зображення");
    url=u.url;
   }
   const response=await fetch("/api/admin/ready-baskets",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"category-image",categoryKey:key,imageUrl:url})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Не вдалося зберегти фото категорії");
   await refresh();
   setMessage(remove?"Обкладинку категорії скинуто на стандартну.":"Фото категорії збережено в D1.");
  }catch(error){setMessage(error instanceof Error?error.message:"Помилка збереження фото");}
  finally{setCategoryUploading(null);}
 }
 function addProduct(slug:string) {
  if(form.items.some(x=>x.slug===slug))return;
  setForm(prev=>({...prev,items:[...prev.items,{slug,qty:1}]}));
  setQuery("");
 }
 function updateQty(slug:string,qty:number) {
  setForm(prev=>({...prev,items:prev.items.map(x=>x.slug===slug?{...x,qty:Math.max(1,Math.min(20,qty))}:x)}));
 }
 async function save(e:FormEvent) {
  e.preventDefault();
  if(!writable || busy) return;
  if(form.status==="published"&&!ready){setMessage("Для публікації усі товари мають бути активними та доступними.");return;}
  if(form.status==="published"&&!form.categories.length){setMessage("Для публікації оберіть хоча б одну категорію.");return;}
  setBusy(true);setMessage("");
  try {
   const res=await fetch("/api/admin/ready-baskets",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...form,action:"save"})
   });
   const j=await res.json();
   if(!res.ok)throw new Error(j.error || "Не вдалося зберегти");
   await refresh();
   setForm(prev=>({...prev,id:j.basket.id}));
   setMessage("Добірку збережено в Cloudflare D1.");
  }catch(error){setMessage(error instanceof Error?error.message:"Помилка");}
  finally{setBusy(false);}
 }
 async function remove() {
  if(!form.id||!writable||!window.confirm("Видалити цю добірку? Товари каталогу не будуть видалені."))return;
  setBusy(true);setMessage("");
  try {
   const res=await fetch("/api/admin/ready-baskets",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"delete",id:form.id})
   });
   const j=await res.json();if(!res.ok)throw new Error(j.error || "Не вдалося видалити");
   await refresh();newBasket();setMessage("Добірку видалено.");
  }catch(error){setMessage(error instanceof Error?error.message:"Помилка");}
  finally{setBusy(false);}
 }
 async function upload(file?:File) {
  if(!file)return;
  setImageUploading(true);setMessage("");
  try{
   const fd=new FormData();fd.append("file",file);
   const res=await fetch("/api/admin/upload",{method:"POST",body:fd});
   const j=await res.json();if(!res.ok)throw new Error(j.error||"Не вдалося зберегти фото");
   update("imageUrl",j.url);
   setMessage("Фото завантажено. Для збереження добірки натисніть «Зберегти».");
  }catch(error){setMessage(error instanceof Error?error.message:"Помилка фото");}
  finally{setImageUploading(false);}
 }
 return <div className="admin-products-page rb-admin">
  <div className="admin-page-head"><div>
    <span>RESET COMMERCE · CURATED ROUTINES</span><h1>Готові кошики</h1>
    <p>Створюйте підбірки догляду з товарів магазину. Актуальні ціни розраховуються автоматично.</p>
  </div><Link className="rb-view-link" href="/ready-baskets" target="_blank">Переглянути на сайті <ArrowUpRight /></Link></div>
  {message && <div className="admin-toast" role="status">{message}</div>}
  {!writable && <div className="admin-connect-card"><span>СХОВИЩЕ</span><h2>Збереження поки недоступне</h2>
   <p>{storageReason || "Підключіть D1 та увімкніть SHOP_STORAGE_BACKEND=cloudflare і SHOP_PRODUCTS_BACKEND=d1 після ініціалізації каталогу."}</p>
  </div>}
  <div className="rb-editor-layout">
   <aside className="rb-editor-aside">
    <div className="rb-sidehead"><span>{baskets.length} добірок</span><button type="button" onClick={newBasket}>+ НОВА</button></div>
    {loading?<p>Завантаження…</p>:baskets.length===0?<p className="rb-sideempty">Готових кошиків ще немає. Створіть перший набір.</p>:
      baskets.map(b=><button key={b.id} type="button" className={"rb-basket-select "+(form.id===b.id?"selected":"")} onClick={()=>select(b)}>
       <small>{b.status==="published"?"ОПУБЛІКОВАНО":"ЧЕРНЕТКА"}</small>
       <strong>{b.title}</strong><span>{b.items.length} позицій · {currency(b.calculated?.total||0)}</span>
      </button>)}
   </aside>
   <form className="rb-editor-form" onSubmit={save}>
    <header className="rb-form-header"><span>КОНСТРУКТОР ДОГЛЯДУ</span>
     <h2>{form.id?"Редагування добірки":"Нова добірка"}</h2>
     <p>Підберіть товари, задайте їх кількість і опишіть потребу клієнта.</p>
    </header>
    <div className="rb-editor-fields">
     <label>Назва набору *
      <input required maxLength={160} value={form.title} placeholder="Наприклад, Догляд для чутливої шкіри"
       onChange={e=>{const title=e.target.value;setForm(prev=>({...prev,title,slug:!prev.id&&(!prev.slug||prev.slug===slugify(prev.title))?slugify(title):prev.slug}))}}/>
     </label>
     <label>URL / Slug *
      <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} placeholder="chutlyva-shkira" onChange={e=>update("slug",e.target.value.toLowerCase())}/>
     </label>
     <label className="rb-wide">Потреба або тип шкіри
      <input maxLength={240} value={form.concern} placeholder="Сухість, дискомфорт, порушений бар'єр" onChange={e=>update("concern",e.target.value)}/>
     </label>
     <label className="rb-wide">Опис набору
      <textarea maxLength={3500} rows={3} value={form.description} placeholder="Для кого підходить добірка та що входить у щоденний ритуал" onChange={e=>update("description",e.target.value)}/>
     </label>
     <label>Статус
      <select value={form.status} onChange={e=>update("status",e.target.value as Form["status"])}>
       <option value="draft">Чернетка</option><option value="published">Опубліковано</option>
      </select>
     </label>
     <label>Порядок показу
      <input type="number" value={form.sortOrder} onChange={e=>update("sortOrder",Number(e.target.value))}/>
     </label>
    </div>
    <section className="rb-category-editor">
     <header><span>01 / КАТЕГОРІЇ ДОГЛЯДУ</span><h3>Кому підходить набір?</h3></header>
     <p>Оберіть одну або декілька категорій. Покупці зможуть знайти набір за типом шкіри або конкретним запитом. Для публікації потрібна хоча б одна категорія.</p>
     <div className="rb-category-columns">
      {[{title:"За типом шкіри",data:SKIN_CATEGORIES},{title:"За запитом",data:CONCERN_CATEGORIES}].map(group=><div key={group.title}><h4>{group.title}</h4><div className="rb-category-choices">
       {group.data.map(category=><label key={category.key} className={"rb-category-choice "+(form.categories.includes(category.key)?"is-selected":"")}>
        <input type="checkbox" checked={form.categories.includes(category.key)} onChange={()=>toggleCategory(category.key)}/>
        <span>{category.label}</span><small>{category.description}</small>
       </label>)}
      </div></div>)}
     </div>
     <details className="rb-category-photo-settings">
      <summary>Фото круглих категорій на сайті <span>НАЛАШТУВАТИ</span></summary>
      <p>Можна замінити кожне стандартне фото. Зображення зберігається в R2, посилання — в D1, і застосовується до всіх добірок цієї категорії.</p>
      <div className="rb-category-photo-grid">
       {READY_BASKET_CATEGORIES.map(category=><div className="rb-category-photo-item" key={category.key}>
        <div className="rb-category-photo-preview">
         <SmartProductImage src={categoryImages[category.key]||category.defaultImage} alt={category.label} fallback={<span>RESET</span>}/>
        </div>
        <div><strong>{category.label}</strong><small>{category.kind==="skin"?"ТИП ШКІРИ":"ЗАПИТ"}</small>
         <label className="rb-category-photo-upload">Змінити фото
          <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif" disabled={!writable||categoryUploading!==null}
           onChange={event=>{void uploadCategory(category.key,event.target.files?.[0]);event.target.value="";}}/>
         </label>
         {categoryImages[category.key]&&<button type="button" disabled={categoryUploading!==null} onClick={()=>void uploadCategory(category.key,undefined,true)}>Скинути</button>}
        </div>
       </div>)}
      </div>
     </details>
    </section>
    <section className="rb-products-editor">
     <header><span>02 / СКЛАД</span><h3>Товари в наборі</h3></header>
     <div className="rb-product-search">
      <label htmlFor="ready-basket-search">Додати засіб із каталогу</label>
      <input id="ready-basket-search" type="search" value={query} placeholder="Пошук за назвою або брендом…" onChange={e=>setQuery(e.target.value)}/>
      {query.trim() && <div className="rb-search-results">
       {filtered.length?filtered.map(product=><button type="button" key={product.slug} onClick={()=>addProduct(product.slug)}>
        <span><strong>{product.name}</strong><small>{product.brand} · {currency(product.price)} · {product.status==="active"?"Активний":"Чернетка"}</small></span>
        <b>+</b>
       </button>):<p>Нічого не знайдено</p>}
      </div>}
     </div>
     {selected.length===0?<div className="rb-products-empty">Оберіть хоча б один товар для створення набору.</div>:<div className="rb-selected-list">
      {selected.map(({slug,qty,product})=><article key={slug}>
       <div className="rb-selected-thumb">
        <SmartProductImage src={product?.imageUrl} alt={product?.name||slug} fallback={<span>RESET</span>}/>
       </div>
       <div className="rb-selected-meta"><strong>{product?.name||slug}</strong>
        <span>{product?.brand} · {currency(product?.price||0)} за 1 шт.</span>
        {product?.status!=="active" && <small>Потрібно активувати товар перед публікацією набору</small>}
       </div>
       <div className="rb-qty"><button type="button" onClick={()=>updateQty(slug,qty-1)}>−</button><span>{qty}</span><button type="button" onClick={()=>updateQty(slug,qty+1)}>+</button></div>
       <button type="button" className="rb-remove" onClick={()=>setForm(prev=>({...prev,items:prev.items.filter(x=>x.slug!==slug)}))} aria-label="Прибрати товар">×</button>
      </article>)}
     </div>}
     <div className="rb-total"><span>{selected.reduce((acc,x)=>acc+x.qty,0)} засобів у наборі</span><strong>{currency(sum)}</strong></div>
     <p className="rb-tiny">Сума автоматично враховує поточні ціни товарів та акції. Оплата відбувається через стандартний кошик.</p>
    </section>
    <section className="rb-image-editor">
     <header><span>03 / ОБКЛАДИНКА</span><h3>Зображення добірки</h3></header>
     <p>За замовчуванням сайт покаже фото товарів із набору. За бажанням завантажте окрему обкладинку.</p>
     <div className="rb-cover-preview">
      {form.imageUrl?<SmartProductImage src={form.imageUrl} alt={form.title} fallback={<span>Фото недоступне</span>}/>:<span>RESET / CURATED CARE</span>}
     </div>
     <div className="rb-cover-actions">
      <label className="rb-upload">+ ЗАВАНТАЖИТИ ФОТО<input disabled={imageUploading||!writable} hidden type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=""}}/></label>
      {form.imageUrl&&<button type="button" onClick={()=>update("imageUrl",null)}>Прибрати обкладинку</button>}
     </div>
     <label>Або URL зображення<input value={form.imageUrl||""} onChange={e=>update("imageUrl",e.target.value||null)} placeholder="/api/media/..." /></label>
    </section>
    <footer className="rb-editor-footer">
     <div><span>ПІДСУМОК</span><strong>{currency(sum)}</strong><small>{ready?"Усі товари доступні":"Для публікації перевірте активність і наявність усіх товарів"}</small></div>
     <div className="rb-save-actions">{form.id&&<button className="rb-delete-btn" type="button" disabled={busy||!writable} onClick={()=>void remove()}>Видалити</button>}
      <button className="rb-save-btn" type="submit" disabled={busy||!writable||selected.length===0}>{busy?"ЗБЕРЕЖЕННЯ…":"ЗБЕРЕГТИ НАБІР"}</button></div>
    </footer>
   </form>
  </div>
 </div>;
}
