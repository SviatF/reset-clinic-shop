"use client";
import {useEffect,useState} from "react";

type Item={slug:string;id:string;name:string;missing:boolean;sourcePage:string;hasVerifiedImageUrl:boolean};
type PhotoResult={slug:string;status:"added"|"failed"|"skipped";reason?:string};
export default function AdminHistolabPhotoRepair({disabled,onFinished}:{
  disabled:boolean;onFinished:()=>Promise<void>;
}) {
  const [items,setItems]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState("");
  const [results,setResults]=useState<PhotoResult[]>([]);
  const [error,setError]=useState("");
  const remaining=items.filter(p=>p.missing);
  async function refresh() {
    const response=await fetch("/api/admin/products/repair-histolab-photos",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Помилка перевірки Histolab");
    setItems(data.rows||[]);
  }
  useEffect(()=>{
    refresh().catch(e=>setError(e instanceof Error?e.message:String(e)))
      .finally(()=>setLoading(false));
  },[]);
  async function repair() {
    if(busy||!remaining.length||disabled)return;
    if(!window.confirm(
      "Завантажити офіційні фотографії Histolab у Cloudflare R2 та прикріпити до "+
      remaining.length+" товарів без фото? Існуючі фото, ціни, залишки й статуси залишаться без змін."
    ))return;
    setBusy(true);setResults([]);setError("");setProgress("");
    let completed:PhotoResult[]=[];
    try {
      const slugs=remaining.map(p=>p.slug);
      for(let i=0;i<slugs.length;i+=4) {
        const batch=slugs.slice(i,i+4);
        setProgress("Перевіряємо офіційні фото: "+Math.min(i+4,slugs.length)+" із "+slugs.length);
        const response=await fetch("/api/admin/products/repair-histolab-photos",{
          method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
          body:JSON.stringify({slugs:batch}),
        });
        const body=await response.json();
        if(!response.ok)throw new Error(body.error||"Не вдалося імпортувати фото");
        completed=[...completed,...body.results];
        setResults(completed);
      }
      await refresh();
      try{await onFinished();}
      catch{setError("Фото записані в D1, але список не оновився. Оновіть сторінку.");}
      const success=completed.filter(x=>x.status==="added").length;
      setProgress("Готово: прикріплено "+success+" із "+slugs.length+" фото. "+
        "Решта товарів, якщо є, залишилися без змін.");
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Помилка завантаження");
    } finally {setBusy(false);}
  }
  return <section className="admin-official-photos">
    <div className="admin-official-photos-header">
      <div>
        <span>OFFICIAL SUPPLIER MEDIA / HISTOLAB</span>
        <strong>Фото Histolab із каталогу виробника</strong>
        <p>Знайдено {items.length} точних карток постачальника. Без фото в D1: <b>{loading?"…":remaining.length}</b>.
          Завантаження з офіційних джерел відразу зберігає фотографії у R2 та підключає до відповідних товарів.</p>
      </div>
      <button type="button" disabled={disabled||loading||busy||!remaining.length}
        onClick={()=>{void repair();}}>
        {busy?"Підключаємо фото…":remaining.length?"Знайти й прикріпити "+remaining.length+" фото →":"Фото вже прикріплені"}
      </button>
    </div>
    {progress&&<p className="admin-official-photos-progress" role="status">{progress}</p>}
    {error&&<p className="admin-official-photos-error" role="alert">{error}</p>}
    {results.some(r=>r.status==="failed")&&
      <details className="admin-official-photos-errors">
        <summary>Не вдалося завантажити: {results.filter(r=>r.status==="failed").length}</summary>
        {results.filter(r=>r.status==="failed").map(r=><p key={r.slug}>
          {items.find(p=>p.slug===r.slug)?.name||r.slug}: {r.reason}
        </p>)}
      </details>}
    <p className="admin-official-photos-note">
      Фотографії підтягуються лише за заздалегідь перевіреними адресами товарів Histolab.
      Якщо сайт виробника тимчасово не віддає файл, товар пропускається — чуже фото не підставляється.
    </p>
  </section>;
}
