"use client";
import {useEffect,useState,type FormEvent} from "react";
type Cat={id:string;slug:string;name:string;parent_slug:string|null;status:"active"|"hidden";sort_order:number;description:string;seo_title:string;seo_description:string};
const initial={id:"",slug:"",name:"",parent_slug:"hair",status:"active",sort_order:10,description:"",seo_title:"",seo_description:""};
export default function AdminCategoriesClient(){
 const [items,setItems]=useState<Cat[]>([]),[form,setForm]=useState<any>(initial),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 async function load(){const r=await fetch("/api/admin/categories",{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error);setItems(j.categories);}
 useEffect(()=>{load().catch(e=>setMessage(String(e)));},[]);
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setMessage("");try{
  const r=await fetch("/api/admin/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}),j=await r.json();
  if(!r.ok)throw new Error(j.error);setItems(j.categories);setForm(initial);setMessage("Підкатегорію збережено");
 }catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setSaving(false);}}
 async function remove(id:string){if(!confirm("Видалити підкатегорію?"))return;try{
  const r=await fetch("/api/admin/categories",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}),j=await r.json();
  if(!r.ok)throw new Error(j.error);setItems(j.categories);setForm(initial);
 }catch(e){setMessage(e instanceof Error?e.message:String(e))}}
 function update(key:string,value:any){setForm((f:any)=>({...f,[key]:value}));}
 return <div className="admin-products-page">
  <div className="admin-page-head"><div><span>CATALOG STRUCTURE</span><h1>Категорії</h1><p>Створюйте підкатегорії без змін у коді. Основні розділи залишаються фіксованими.</p></div></div>
  {message&&<div className="admin-toast">{message}</div>}
  <div className="admin-product-workspace">
   <aside className="admin-product-list">
    {(["hair","face","body"] as const).map(parent=><div key={parent}>
      <div className="admin-list-head"><strong>{({hair:"Волосся",face:"Обличчя",body:"Тіло"} as const)[parent]}</strong></div>
      {items.filter(c=>c.parent_slug===parent).sort((a,b)=>a.sort_order-b.sort_order).map(cat=><button key={cat.id} type="button" onClick={()=>{setForm(cat);setMessage("")}} className={form.id===cat.id?"is-selected":""}>
       <div><strong>{cat.name}</strong><small>/{parent}/{cat.slug} · {cat.status}</small></div>
      </button>)}
     </div>)}
   </aside>
   <form className="admin-product-form" onSubmit={save}>
    <div className="admin-form-title"><div><span>{form.id?"EDIT SUBCATEGORY":"NEW SUBCATEGORY"}</span><h2>{form.name||"Нова підкатегорія"}</h2></div><button type="button" className="admin-primary" onClick={()=>setForm(initial)}>+ Нова</button></div>
    <section className="admin-form-section"><h3>Дані підкатегорії</h3><div className="admin-form-grid">
      <label><span>Розділ</span><select value={form.parent_slug} disabled={Boolean(form.id)} onChange={e=>update("parent_slug",e.target.value)}><option value="hair">Волосся</option><option value="face">Обличчя</option><option value="body">Тіло</option></select></label>
      <label><span>Назва *</span><input value={form.name} required onChange={e=>update("name",e.target.value)}/></label>
      <label><span>Slug *</span><input value={form.slug} required placeholder="shampoo" onChange={e=>update("slug",e.target.value)}/></label>
      <label><span>Порядок</span><input type="number" value={form.sort_order} onChange={e=>update("sort_order",Number(e.target.value))}/></label>
      <label><span>Відображення</span><select value={form.status} onChange={e=>update("status",e.target.value)}><option value="active">Активна</option><option value="hidden">Прихована</option></select></label>
      <label className="wide"><span>Опис</span><textarea rows={3} value={form.description} onChange={e=>update("description",e.target.value)}/></label>
      <label className="wide"><span>SEO Title</span><input value={form.seo_title} onChange={e=>update("seo_title",e.target.value)}/></label>
      <label className="wide"><span>SEO Description</span><textarea rows={2} value={form.seo_description} onChange={e=>update("seo_description",e.target.value)}/></label>
     </div></section>
     <div className="admin-form-actions"><button type="submit" className="admin-primary" disabled={saving}>{saving?"Збереження...":"Зберегти"}</button>{form.id&&<button type="button" className="admin-danger" onClick={()=>remove(form.id)}>Видалити</button>}</div>
   </form>
  </div>
 </div>
}
