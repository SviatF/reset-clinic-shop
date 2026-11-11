"use client";
import {useEffect,useState,type FormEvent} from "react";
type Brand={id:string;slug:string;name:string;status:"active"|"hidden";sort_order:number;lines:string[]};
const empty={id:"",slug:"",name:"",status:"active",sort_order:50,lines:[] as string[]};
export default function AdminBrandsClient(){
 const [items,setItems]=useState<Brand[]>([]),[form,setForm]=useState<any>(empty),[lines,setLines]=useState("");
 const [message,setMessage]=useState(""),[loading,setLoading]=useState(false),[writable,setWritable]=useState(false),[storageIssue,setStorageIssue]=useState("");
 async function load(){const r=await fetch("/api/admin/brands",{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error);setItems(j.brands);setWritable(Boolean(j.writable));setStorageIssue(j.storageIssue||"Сховище для запису недоступне.");}
 useEffect(()=>{load().catch(e=>setMessage(String(e)));},[]);
 function select(item:Brand){setForm(item);setLines(item.lines.join("\n"));setMessage("");}
 async function save(e:FormEvent){e.preventDefault();if(!writable)return;setLoading(true);setMessage("");
 try{
  const body={...form,lines:lines.split("\n").map(v=>v.trim()).filter(Boolean)};
  const r=await fetch("/api/admin/brands",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),j=await r.json();
  if(!r.ok)throw new Error(j.error);setItems(j.brands);setForm(empty);setLines("");setMessage("Бренд збережено");
 }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setLoading(false)}}
 async function remove(){if(!writable||!form.id||!confirm("Видалити бренд?"))return;
  const r=await fetch("/api/admin/brands",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:form.id})}),j=await r.json();
  if(!r.ok){setMessage(j.error);return;}setItems(j.brands);setForm(empty);setLines("");
 }
 return <div className="admin-products-page"><div className="admin-page-head"><div><span>BRAND DIRECTORY</span><h1>Бренди та лінійки</h1><p>Керування виробниками та продуктовими серіями незалежно від категорій.</p></div></div>
 {message&&<div className="admin-toast">{message}</div>}
 {!writable&&<div className="admin-connect-card" role="status"><span>ЛИШЕ ПЕРЕГЛЯД</span><h2>Збереження брендів недоступне</h2><p>{storageIssue}</p><p>Після налаштування перевірте <a href="/api/health" target="_blank" rel="noreferrer" style={{textDecoration:"underline"}}>/api/health</a>: очікується storage=d1 та writable=true. Не активуйте D1 до міграції чинних замовлень і товарів.</p></div>}
 <div className="admin-product-workspace">
 <aside className="admin-product-list">{items.sort((a,b)=>a.sort_order-b.sort_order).map(item=><button key={item.id} type="button" onClick={()=>select(item)} className={form.id===item.id?"is-selected":""}><div><strong>{item.name}</strong><small>{item.lines.length} лінійок · {item.status}</small></div></button>)}</aside>
 <form className="admin-product-form" onSubmit={save}>
  <div className="admin-form-title"><div><span>{form.id?"EDIT BRAND":"NEW BRAND"}</span><h2>{form.name||"Новий бренд"}</h2></div><button className="admin-primary" type="button" onClick={()=>{setForm(empty);setLines("")}}>+ Новий</button></div>
  <section className="admin-form-section"><div className="admin-form-grid">
   <label><span>Бренд *</span><input required disabled={Boolean(form.id)} value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))}/></label>
   <label><span>Slug</span><input disabled={Boolean(form.id)} placeholder="dermafirm" value={form.slug} onChange={e=>setForm((f:any)=>({...f,slug:e.target.value}))}/></label>
   <label><span>Сортування</span><input type="number" value={form.sort_order} onChange={e=>setForm((f:any)=>({...f,sort_order:Number(e.target.value)}))}/></label>
   <label><span>Видимість</span><select value={form.status} onChange={e=>setForm((f:any)=>({...f,status:e.target.value}))}><option value="active">Активний</option><option value="hidden">Прихований</option></select></label>
   <label className="wide"><span>Продуктові лінійки (одна на рядок)</span><textarea rows={9} value={lines} onChange={e=>setLines(e.target.value)}/></label>
  </div></section>
  <div className="admin-form-actions"><button type="submit" className="admin-primary" disabled={loading||!writable}>Зберегти</button>{form.id&&<button type="button" className="admin-danger" disabled={!writable} onClick={remove}>Видалити</button>}</div>
 </form></div></div>;
}
