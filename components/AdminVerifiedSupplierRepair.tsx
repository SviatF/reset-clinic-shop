"use client";
import { useEffect, useState } from "react";
type Row={slug:string;name:string;brand:string;missing:boolean;sourcePage:string};
type Sync={slug:string;state:"attached"|"skipped"|"failed";reason?:string};
export default function AdminVerifiedSupplierRepair({disabled,onFinished}:{
 disabled:boolean; onFinished:()=>Promise<void>;
}){
 const [rows,setRows]=useState<Row[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [result,setResult]=useState<Sync[]>([]);
 const [progress,setProgress]=useState("");
 const missing=rows.filter(x=>x.missing);
 async function refresh(){
  const response=await fetch("/api/admin/products/repair-supplier-photos",{cache:"no-store"});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||"Не вдалося перевірити фото");
  setRows(body.rows||[]);
 }
 useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[]);
 async function recover(){
  if(!missing.length||busy||disabled)return;
  if(!window.confirm("Завантажити перевірені офіційні фото "+missing.length+
   " товарів у Cloudflare R2 і зберегти URL у D1? Існуючі фотографії, ціни й залишки не змінюватимуться."))return;
  setBusy(true);setError("");setProgress("");
  let all:Sync[]=[];
  try{
   const slugs=missing.map(x=>x.slug);
   for(let i=0;i<slugs.length;i+=4){
    const response=await fetch("/api/admin/products/repair-supplier-photos",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({slugs:slugs.slice(i,i+4)}),cache:"no-store",
    });
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"Помилка запису в D1/R2");
    all=[...all,...body.results];setResult(all);
    setProgress("Оброблено "+Math.min(slugs.length,i+4)+" із "+slugs.length);
   }
   await refresh();
   await onFinished();
   setProgress("Прикріплено "+all.filter(x=>x.state==="attached").length+" фото. "+
    all.filter(x=>x.state==="failed").length+" потребують перевірки.");
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 return <section className="admin-official-photos">
  <div className="admin-official-photos-header"><div>
   <span>OFFICIAL SUPPLIER MEDIA / DÉCAAR · SENSILIS · HYDROPEPTIDE</span>
   <strong>Підтягнути перевірені фотографії інших брендів</strong>
   <p>Зіставлено {rows.length} точних сторінок товарів. Без фото в D1:
    <b> {missing.length}</b>. Зображення з офіційних сторінок перевіряються й записуються у R2.</p>
   </div>
   <button type="button" disabled={disabled||busy||!missing.length}
    onClick={()=>{void recover();}}>{busy?"Відновлюємо фото…":
      missing.length?"Прикріпити "+missing.length+" фото →":"Підтверджених фото більше не бракує"}</button>
  </div>
  {progress&&<p className="admin-official-photos-progress" role="status">{progress}</p>}
  {error&&<p className="admin-official-photos-error" role="alert">{error}</p>}
  {result.some(x=>x.state==="failed")&&<details className="admin-official-photos-errors">
   <summary>Пропущено / не вдалося: {result.filter(x=>x.state==="failed").length}</summary>
   {result.filter(x=>x.state==="failed").map(x=><p key={x.slug}>{rows.find(r=>r.slug===x.slug)?.name||x.slug}: {x.reason}</p>)}
  </details>}
  <p className="admin-official-photos-note">Товари з невстановленою відповідністю чи іншими SPF, об'ємом та формулою не змінюються.</p>
 </section>;
}
