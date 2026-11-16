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
  const matches: string[] = [];
  // Product-specific OpenCart gallery: prefer original/full-size href over tiny thumbnails.
  for (const tag of html.match(/<(?:a|meta|img)\b[^>]+>/gi)||[]) {
    if (/^<meta/i.test(tag) && !/(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["']/i.test(tag)) continue;
    const href = /\b(?:href|content|data-original|data-zoom-image|data-src|src)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
    for(const x of tag.matchAll(href)) {
      const value = officialHistoImageUrl(x[1]||x[2],page);
      if(value) matches.push(value);
    }
  }
  // Avoid generic icons. Higher-resolution gallery images take precedence.
  const score = (value:string) => {
    const size = [...value.matchAll(/(\d{3,4})x(\d{3,4})/g)]
      .map(m=>Math.min(Number(m[1]),Number(m[2]))).at(-1)||0;
    return size + (value.includes("/catalog/products/")?200:0)
      - (value.includes("icon")||value.includes("logo")?10000:0);
  };
  return [...new Set(matches)].sort((a,b)=>score(b)-score(a))[0]||null;
}
export function photoMimeFromBytes(bytes:Uint8Array, mime:string) {
  const sig=(...nums:number[])=>nums.every((n,i)=>bytes[i]===n);
  if(mime==="image/jpeg" && sig(255,216,255)) return "jpg";
  if(mime==="image/png" && sig(137,80,78,71,13,10,26,10)) return "png";
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  if(mime==="image/webp" && ascii(0,4)==="RIFF" && ascii(8,12)==="WEBP") return "webp";
  return null;
}
