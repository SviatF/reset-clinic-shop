/** Only first-party Histolab catalog images from its own official product pages.
 * Do not use unrelated products, external sellers, or generic collection banners. */
const IMAGE_HOST="histolab.com.ua";
export function officialHistoImageUrl(input: string | null | undefined, base: string) {
  if (!input) return null;
  try {
    const url = new URL(input.replace(/&amp;/g,"&").replace(/&#38;/g,"&"),base);
    if(url.protocol!=="https:" || url.hostname!==IMAGE_HOST || url.username || url.password ||
      !url.pathname.startsWith("/image/") ||
      !/\.(?:jpe?g|webp|png)(?:$)/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
export function extractOfficialHistolabImage(html: string, page: string) {
  // Only structured product metadata. Never pick the largest image from the
  // entire page: that can be an unrelated recommended item.
  for (const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (property !== "og:image" && property !== "twitter:image") continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    const url = officialHistoImageUrl(content,page);
    if(url) return url;
  }
  return null;
}
export function photoMimeFromBytes(bytes:Uint8Array, mime:string) {
  const sig=(...nums:number[])=>nums.every((n,i)=>bytes[i]===n);
  if(mime==="image/jpeg" && sig(255,216,255)) return "jpg";
  if(mime==="image/png" && sig(137,80,78,71,13,10,26,10)) return "png";
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  if(mime==="image/webp" && ascii(0,4)==="RIFF" && ascii(8,12)==="WEBP") return "webp";
  return null;
}
