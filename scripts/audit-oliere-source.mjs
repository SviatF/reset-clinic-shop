import fs from "node:fs/promises";
const endpoints=[
 "https://oliere.paris/products.json?limit=250",
 "https://oliere.paris/collections/all/products.json?limit=250",
 "https://oliere.paris/collections/shampoo/products.json?limit=250",
 "https://oliereparis.com/products.json?limit=250"
];
for(const url of endpoints){
 try{
  const controller=new AbortController();const tid=setTimeout(()=>controller.abort(),24000);
  const response=await fetch(url,{headers:{'Accept':'application/json,text/html;q=0.5','User-Agent':'Mozilla/5.0 (compatible; ResetClinicProductCatalogAudit/1.0)'},signal:controller.signal,redirect:"follow"});clearTimeout(tid);
  const contentType=response.headers.get('content-type');
  const raw=await response.text();
  let products=[];try{const body=JSON.parse(raw);products=body.products||[]}catch{}
  console.log(JSON.stringify({url,status:response.status,type:contentType,bytes:raw.length,products:products.length,sample:products.slice(0,8).map(p=>({id:p.id,handle:p.handle,title:p.title,variants:p.variants?.map(v=>({id:v.id,title:v.title,sku:v.sku})).slice(0,5),images:p.images?.length,featuredImage:p.image?.src?.slice(0,150)})),bodyStart:products.length?undefined:raw.slice(0,200)}));
  if(products.length){await fs.writeFile('oliere-official-products.json',JSON.stringify(products,null,2));break}
 }catch(e){console.log(JSON.stringify({url,error:String(e)}))}
}
