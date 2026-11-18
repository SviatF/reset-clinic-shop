/** Strict first-party verification for brand product images.
 * Missing or ambiguous image data is skipped, never assigned by fuzzy match.
 */
export const OFFICIAL_BRAND_HOSTS: Record<string,string[]> = {
  "HydroPeptide":["hydropeptide.ua","hydropeptide.com","www.hydropeptide.com"],
  "Sensilis":["sensilis.com.ua","www.sensilis.com.ua","sensilis.com","www.sensilis.com","karvatska.store"],
  "DÉCAAR":["decaar.com.ua","www.decaar.com.ua"],
  "Cetaphil":["avepharm.com.ua"],
  "CU SKIN":["cu.ua","key.cu.ua"],
};
const imageCDNs=["cdn.shopify.com"];
export type OfficialSource={brand:string;page:string;title:string};
export function officialPageUrl(page:string,brand:string):URL|null{
  try{const u=new URL(page);
    return u.protocol==="https:"&&!u.username&&!u.password&&
      OFFICIAL_BRAND_HOSTS[brand]?.includes(u.hostname)?u:null;
  }catch{return null;}
}
export function officialImageUrl(src:string,source:OfficialSource):string|null{
  try{
    const u=new URL(src.replace(/&amp;/g,"&").replace(/&#38;/g,"&"),source.page);
    if(u.protocol!=="https:"||u.username||u.password)return null;
    if(![...OFFICIAL_BRAND_HOSTS[source.brand],...imageCDNs].includes(u.hostname))return null;
    if(!/\.(jpg|jpeg|png|webp)(?:$|\?)/i.test(u.pathname+u.search))return null;
    if(u.pathname.toLowerCase().includes("logo")||u.pathname.toLowerCase().includes("favicon"))return null;
    return u.href;
  }catch{return null;}
}
function decode(text:string){
  return text.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&")
    .replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function normalize(text:string){
  return decode(text).normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9а-яіїєґ+%]+/giu," ").replace(/\s+/g," ").trim();
}
const irrelevant=new Set(["sensilis","hydropeptide","decaar","skin","cream","serum","spf","the","and","for"]);
export function supportsOfficialProductIdentity(html:string,source:OfficialSource){
  const htmlTitle=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"";
  const head=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"";
  const sourceName=normalize(source.title);
  const candidates=normalize(htmlTitle.replace(/<[^>]+>/g,"")+" "+head.replace(/<[^>]+>/g,""));
  if(!sourceName||!candidates)return false;
  const tokens=sourceName.split(" ").filter(x=>x.length>2&&!irrelevant.has(x));
  const pageTokens=new Set(candidates.split(" "));
  // Distinctive words must be present, but skip unverified pages if all
  // identifying tokens are generic or the version/strength has changed.
  return tokens.length>0&&tokens.every(t=>pageTokens.has(t));
}
export function extractProductPhoto(html:string,source:OfficialSource):string|null{
  // Only product-specific Open Graph / Twitter metadata, never category
  // thumbnails or "related products" recommendations.
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const type=tag.match(/\b(?:name|property)\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    const property=type?.[1]||type?.[2]||"";
    if(!["og:image","og:image:secure_url","twitter:image"].includes(property))continue;
    const content=tag.match(/\bcontent\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    const uri=officialImageUrl(content?.[1]||content?.[2]||"",source);
    if(uri)return uri;
  }
  return null;
}
export function imageExtension(bytes:Uint8Array,mime:string):"webp"|"jpg"|"png"|null{
  const b=(...n:number[])=>n.every((x,i)=>bytes[i]===x);
  const ascii=(a:number,z:number)=>String.fromCharCode(...bytes.slice(a,z));
  if(/^image\/(?:jpeg|pjpeg)$/.test(mime)&&b(255,216,255))return "jpg";
  if(mime==="image/png"&&b(137,80,78,71,13,10,26,10))return "png";
  if(mime==="image/webp"&&ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")return "webp";
  return null;
}
