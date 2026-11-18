import photoMap from "../../data/supplier-photo-map.json" with {type:"json"};

/**
 * D1 raw records were missing ~100 paths even though readProducts() already
 * filled them from this exact audited, checked-in local mapping at runtime.
 * Persist the SAME path so the API/admin/DB all reflect actual media status.
 * Never overwrite merchant-customized pictures or publish draft products.
 */
const approved=(path)=>typeof path==="string"&&
  /^\/supplier-photos\/[a-zA-Z0-9/_.-]+\.(?:png|jpe?g|webp)$/i.test(path)&&
  !path.includes("..");
export function backfillLocalRows(rows,map=photoMap){
  let updated=0,skipped=0;
  const next=rows.map(product=>{
    if(!product||!product.slug||product.image_url)return product;
    const ref=map[product.slug];
    if(!ref||ref.verification_status==="needs_review"||!approved(ref.image_url))return product;
    // Only known original catalog brands, never a mismatched manual entry.
    if(!["OLIE'RE PARIS","Dermafirm","Braderm","Histolab","HydroPeptide",
      "Cetaphil","Sensilis","DÉCAAR","CU SKIN"].includes(product.brand)){
       skipped++;return product;
    }
    updated++;
    return {...product,image_url:ref.image_url,updated_at:new Date().toISOString()};
  });
  return {products:next,updated,skipped};
}
export async function backfillVerifiedLocalMedia(env) {
  for(let attempt=0;attempt<8;attempt++){
    const row=await env.SHOP_DB.prepare(
      "SELECT content,version FROM shop_documents WHERE pathname='data/products.json'"
    ).first();
    if(!row)throw Error("Missing D1 product document");
    const products=JSON.parse(row.content);
    if(!Array.isArray(products)||products.length<300)
      throw Error("Refusing to update incomplete catalog");
    const {products:next,updated,skipped}=backfillLocalRows(products);
    if(!updated)return {updated:0,skipped};
    const response=await env.SHOP_DB.prepare(
      "UPDATE shop_documents SET content=?,version=version+1,updated_at=datetime('now') WHERE pathname='data/products.json' AND version=?"
    ).bind(JSON.stringify(next),Number(row.version)).run();
    if((response.meta?.changes||0)>0){
      console.log("RESET Shop persisted verified local catalog image URLs",JSON.stringify({updated,skipped}));
      return {updated,skipped};
    }
  }
  throw Error("D1 changed during local verified photo path backfill");
}
