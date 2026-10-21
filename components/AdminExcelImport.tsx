"use client";
import {useState,type ChangeEvent} from "react";
import {parseSupplierWorkbook,type ExcelDraft,type PreparedPhoto} from "@/lib/excel-client";
type Prepared={products:ExcelDraft[];photos:PreparedPhoto[];warnings:string[]};
async function optimized(file:File):Promise<File>{
 if(file.size<=8*1024*1024)return file;
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas недоступний");
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",0.87));
 if(!blob)throw new Error("Не вдалося оптимізувати "+file.name);
 return new File([blob],file.name.replace(/\.[^.]+$/,".webp"),{type:"image/webp"});
}
export default function AdminExcelImport({onFinished}:{onFinished:()=>Promise<void>|void}){
 const [ready,setReady]=useState<Prepared|null>(null);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(""),[error,setError]=useState(""),[preview,setPreview]=useState<{duplicates:string[];new_count:number}|null>(null);
 async function load(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  setBusy(true);setError("");setProgress("Аналіз Excel");setReady(null);
  try{
   const parsed=await parseSupplierWorkbook(file);
   const res=await fetch("/api/admin/products/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:parsed.products,preview:true})});
   const result=await res.json();
   if(!res.ok)throw new Error(result.error||"Помилка перевірки");
   setReady(parsed);setPreview({duplicates:result.duplicates||[],new_count:result.new_count});
   setProgress(`Знайдено ${parsed.products.length} товарів та ${parsed.photos.length} фотографій`);
  }catch(ex){setError(ex instanceof Error?ex.message:String(ex));setProgress("");}finally{setBusy(false);}
 }
 async function commit(){
  if(!ready||busy||!confirm("Завантажити перевірені товари як ЧЕРНЕТКИ? Товари не з'являться у продажу без публікації."))return;
  setBusy(true);setError("");
  try{
   const cap=await fetch("/api/admin/media-status",{cache:"no-store"});const capBody=await cap.json();
   if(!cap.ok||!capBody.r2)throw new Error("Для пакетного завантаження фото підключіть Cloudflare R2 (binding SHOP_MEDIA) до staging Worker.");
   const enriched=ready.products.map(p=>({...p}));
   const index=new Map(enriched.map((p,i)=>[p.slug,i]));
   const skip=new Set(preview?.duplicates||[]);
   for(let i=0;i<ready.photos.length;i++){
    const photo=ready.photos[i];if(skip.has(photo.slug))continue;
    setProgress(`Завантаження фото ${i+1} з ${ready.photos.length}: ${photo.slug}`);
    const file=await optimized(photo.file);
    if(file.size>10*1024*1024)throw new Error("Фото "+file.name+" більше 10MB після оптимізації");
    const fd=new FormData();fd.append("file",file);
    const upload=await fetch("/api/admin/upload",{method:"POST",body:fd});
    const result=await upload.json();
    if(!upload.ok||!result.url)throw new Error(result.error||"Не вдалося завантажити "+photo.slug);
    const n=index.get(photo.slug);if(n!==undefined)enriched[n].image_url=result.url;
   }
   setProgress("Збереження товарів у чернетках");
   const res=await fetch("/api/admin/products/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:enriched,preview:false})});
   const result=await res.json();if(!res.ok)throw new Error(result.error||"Не вдалося імпортувати товари");
   setProgress(`Імпортовано ${result.created_count} чернеток. Перевірте ціни, склад, призначення, наявність перед публікацією.`);
   setReady(null);setPreview(null);await onFinished();
  }catch(ex){setError(ex instanceof Error?ex.message:String(ex));}finally{setBusy(false);}
 }
 return <section className="admin-form-section" style={{marginBottom:32}}>
  <h3>Імпорт Dermafirm / Braderm з Excel</h3>
  <p>Автоматично переносить 39 товарів і фото з файлу постачальника. Нові позиції залишаються чернетками з нульовими залишками.</p>
  <label className="admin-upload"><input disabled={busy} type="file" accept=".xlsx" onChange={load}/><span>Вибрати Excel (.xlsx)</span></label>
  {progress&&<p role="status" style={{marginTop:12}}>{progress}</p>}
  {error&&<p role="alert" style={{color:"#a11"}}>{error}</p>}
  {ready&&<div style={{marginTop:14}}>
    <p><b>{ready.products.length} товарів</b> / {ready.photos.length} фото. Нових: {preview?.new_count??0}. Дублі: {preview?.duplicates.length??0}.</p>
    {ready.warnings.length>0&&<details><summary>Зауваження ({ready.warnings.length})</summary><ul>{ready.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    <p><b>Увага:</b> ціни та товарні твердження з Excel не перевірені. Статус товарів після імпорту — Draft.</p>
    <button className="admin-primary" disabled={busy||!preview?.new_count} onClick={commit} type="button">Імпортувати чернетки та фотографії</button>
  </div>}
 </section>;
}
