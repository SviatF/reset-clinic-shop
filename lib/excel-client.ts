"use client";
import {strFromU8,unzipSync} from "fflate";
export type ExcelDraft = {
 slug:string;name:string;brand:string;product_line:string;category:"face"|"body"|"hair";
 subcategory_slugs:string[];status:"draft";price:number;currency:"UAH";size:string;
 stock_quantity:0;track_stock:true;short_description:string;description:string;
 how_to_use:string;inci:string;image_url?:string;
};
export type PreparedPhoto = {slug:string;file:File};
type Parsed={products:ExcelDraft[];photos:PreparedPhoto[];warnings:string[]};
const XML="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const DML="http://schemas.openxmlformats.org/drawingml/2006/main";
const DRAW="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const OREL="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const parse=(text:string)=>{const doc=new DOMParser().parseFromString(text,"application/xml");if(doc.getElementsByTagName("parsererror").length)throw new Error("Некоректний Excel XML");return doc;};
const els=(root:Document|Element,ns:string,name:string)=>Array.from(root.getElementsByTagNameNS(ns,name));
const one=(root:Document|Element,ns:string,name:string)=>els(root,ns,name)[0]||null;
const clean=(value:string)=>value.replace(/\r/g,"").trim();
const makeSlug=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,118);
function classify(name:string):{category:"face"|"body"|"hair";sub:string[]}{
 const n=name.toLocaleLowerCase("uk");
 const hair=/шампун|shampoo|scalp|волосс|kerato psor/.test(n);
 const body=!hair&&/для тіла|body/.test(n);
 const category=hair?"hair":body?"body":"face";
 if(category==="hair")return {category,sub:/шампун|shampoo/.test(n)?["shampoo"]:[]};
 if(/spf|сонцезахис|sun.?cream|sunscreen|uv.?derm/.test(n))return {category,sub:["spf"]};
 if(/пінка|вмиван|очищ|cleanser|cleansing|mousse|wash/.test(n))return {category,sub:["cleansing"]};
 if(category==="face"&&/тонік|тонер|toner|tonic/.test(n))return {category,sub:["toning"]};
 if(category==="face"&&/сироват|серум|serum|ampoule|ампул/.test(n))return {category,sub:["serums"]};
 if(/крем|cream|емульс|лосьйон|lotion/.test(n))return {category,sub:["cream"]};
 return {category,sub:[]};
}
function line(brand:string,name:string){
 if(brand!=="Dermafirm")return "";
 const n=name.toLowerCase();
 if(n.includes("peptology"))return "Peptology";
 if(n.includes("uv-derm")||n.includes("uv derm"))return "UV-Derm";
 if(n.includes("age reviving"))return "Age Reviving A4";
 if(n.includes("the peptide"))return "The Peptide P4";
 if(n.includes("moist barrier")||n.includes("bio correction"))return "Moist Barrier M4";
 if(n.includes("soothing repair")||n.includes("hydra  foaming"))return "Soothing Repair R4";
 if(n.includes("cicaa"))return "CICAA-C";
 return "Special Care";
}
async function imageFile(bytes:Uint8Array,name:string):Promise<File>{
 const ext=name.split(".").pop()?.toLowerCase();
 const type=ext==="jpg"||ext==="jpeg"?"image/jpeg":ext==="png"?"image/png":ext==="webp"?"image/webp":"image/octet-stream";
 const buf=bytes.slice().buffer as ArrayBuffer;
 return new File([buf],name,{type});
}
export async function parseSupplierWorkbook(file:File):Promise<Parsed>{
 if(!/\.xlsx$/i.test(file.name))throw new Error("Потрібен файл Excel .xlsx");
 if(file.size>85*1024*1024)throw new Error("Excel більший за 85 MB");
 const archive=unzipSync(new Uint8Array(await file.arrayBuffer()));
 const get=(path:string)=>{const entry=archive[path];if(!entry)throw new Error("Excel не містить "+path);return parse(strFromU8(entry));};
 const shared=els(get("xl/sharedStrings.xml"),XML,"si").map(x=>x.textContent||"");
 const results:ExcelDraft[]=[],photos:PreparedPhoto[]=[],warnings:string[]=[];
 const found=new Set<string>();
 for(const [index,brand] of [[1,"Dermafirm"],[2,"Braderm"]] as const){
  const sheet=get(`xl/worksheets/sheet${index}.xml`);
  const drawing=get(`xl/drawings/drawing${index}.xml`);
  const rel=get(`xl/drawings/_rels/drawing${index}.xml.rels`);
  const targets=new Map<string,string>();
  for(const item of Array.from(rel.documentElement.children)){
   const id=item.getAttribute("Id"),target=item.getAttribute("Target");
   if(id&&target)targets.set(id,target);
  }
  const anchorPhotos=new Map<number,string>();
  for(const anchor of Array.from(drawing.documentElement.children)){
   const row=one(one(anchor,DRAW,"from")||anchor,DRAW,"row");
   const blip=one(anchor,DML,"blip");
   const id=blip?.getAttributeNS(OREL,"embed")||blip?.getAttribute("r:embed");
   if(!row||!id)continue;
   const target=targets.get(id);
   if(target)anchorPhotos.set(Number(row.textContent)+1,"xl/"+target.replace(/^\.\.\//,""));
  }
  for(const row of els(sheet,XML,"row")){
   const rowIndex=Number(row.getAttribute("r"));
   if(rowIndex===1)continue;
   const data:Record<string,string>={};
   for(const cell of els(row,XML,"c")){
    const col=/^[A-Z]+/.exec(cell.getAttribute("r")||"")?.[0];
    if(!col)continue;
    const raw=one(cell,XML,"v")?.textContent||"";
    const isInline=one(cell,XML,"is");
    data[col]=clean(cell.getAttribute("t")==="s"?shared[Number(raw)]||"":isInline?isInline.textContent||"":raw);
   }
   const title=data.A||"",english=data.B||"",priceNumber=Number((data.F||"").replace(/[^\d.,]/g,"").replace(",","."));
   if(!title||!english||!Number.isFinite(priceNumber)||priceNumber<=0)continue;
   const base=makeSlug(brand+" "+english);
   if(!base)throw new Error("Не вдалося визначити slug у рядку "+rowIndex);
   const slug=found.has(base)?base+"-"+rowIndex:base;
   if(found.has(base))warnings.push(`${brand} рядок ${rowIndex}: однакові міжнародні назви, перевірте дубль`);
   found.add(base);
   const raw=data.D||"";
   const inciMarker=/(?:Ingredients\s*\/\s*Склад\s*\(INCI\)|(?:^|\n)\s*(?:Повний\s+)?склад)\s*:\s*/im.exec(raw);
   const mainPart=inciMarker?raw.slice(0,inciMarker.index).trim():raw;
   const inciText=inciMarker?raw.slice(inciMarker.index+inciMarker[0].length).trim():"";
   const usageMarker=/(?:Спосіб\s*(?:використання|застосування)|Використання)\s*:\s*/i.exec(mainPart);
   const descriptionText=(usageMarker?mainPart.slice(0,usageMarker.index):mainPart).trim();
   const usageText=usageMarker?mainPart.slice(usageMarker.index+usageMarker[0].length).trim():"";

   const classification=classify(title+" "+english);
   const filename=anchorPhotos.get(rowIndex);
   if(filename&&archive[filename]){
    const extension=filename.split(".").pop()||"png";
    photos.push({slug,file:await imageFile(archive[filename],slug+"."+extension)});
   }else warnings.push(`${brand} рядок ${rowIndex}: фотографію не знайдено`);
   if(descriptionText.length>5000)warnings.push(`${brand} рядок ${rowIndex}: опис перевищує 5000 символів`);
   if(brand==="Dermafirm"&&rowIndex===4)warnings.push("Dermafirm рядок 4: міжнародна назва PDRN суперечить опису Niacinamide Vita C+");
   results.push({
    slug,name:title.replace(/\s+/g," ").trim(),brand,product_line:line(brand,english),category:classification.category,
    subcategory_slugs:classification.sub,status:"draft",price:priceNumber,currency:"UAH",size:data.E||"",
    stock_quantity:0,track_stock:true,short_description:descriptionText.split(/\n\s*\n/)[0].slice(0,500),
    description:descriptionText.slice(0,5000),how_to_use:usageText.slice(0,3000),inci:inciText.slice(0,8000)
   });
  }
 }
 if(results.length!==39||photos.length!==39)throw new Error(`Очікували 39 товарів і 39 фото, знайдено ${results.length} / ${photos.length}. Перевірте формат файлу.`);
 return {products:results,photos,warnings};
}
