/**
 * This catalog item was scraped as "Mascara" from a category listing without
 * SKU, size, product page, or model. Sensilis sells multiple distinct mascaras.
 * Publishing an arbitrary packshot would create a misleading product.
 * Archive only the exact untouched generated placeholder (fully reversible).
 */
export async function archiveUnverifiableMascaraPlaceholder(env){
 const slug="supplier-sensilis-mascara";
 for(let attempt=0;attempt<8;attempt++){
  const current=await env.SHOP_DB.prepare(
    "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'"
  ).first();
  if(!current)throw Error("D1 product document absent");
  const rows=JSON.parse(current.content);
  if(!Array.isArray(rows)||rows.length<300)throw Error("Unexpected D1 catalog");
  const matches=rows.filter(p=>p?.slug===slug);
  if(matches.length!==1)return {archived:0,reason:"No unique original placeholder"};
  const p=matches[0];
  if(!(p.id==="source_supplier-sensilis-mascara"&&p.name==="Sensilis Mascara — туш для вій" &&
    p.brand==="Sensilis"&&p.status==="draft"&&!p.sku&&!p.size&&!p.image_url&&Number(p.price)===1400 &&
    p.stock_quantity===0&&p.track_stock===true))
    return {archived:0,reason:"Placeholder changed or already reviewed"};
  const now=new Date().toISOString();
  const description=String(p.description||"").trim();
  const note="Архівована непідтверджена товарна позиція: у вихідному каталозі немає назви моделі туші, SKU чи обсягу. Для відновлення потрібна конкретна модель.";
  const next=rows.map(row=>row.id===p.id?{
    ...row,status:"archived",description:description.includes(note)?description:description+"\n\n"+note,
    updated_at:now
  }:row);
  const changed=await env.SHOP_DB.prepare(
    "UPDATE shop_documents SET content=?,version=version+1,updated_at=datetime('now') WHERE pathname='data/products.json' AND version=?"
  ).bind(JSON.stringify(next),Number(current.version)).run();
  if(Number(changed.meta?.changes||0)>0){
    console.log("Archived unverifiable imported Mascara placeholder",slug);
    return {archived:1,reason:"Unidentifiable placeholder; no product SKU"};
  }
 }
 throw Error("D1 concurrent update prevented safe archive");
}
