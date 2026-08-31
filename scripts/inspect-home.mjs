import { readFile } from "node:fs/promises";
import path from "node:path";

const filePath = path.join(process.cwd(), "legacy-source", "index.html");
const source = await readFile(filePath, "utf8");
const bodyMatch = source.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);

if (!bodyMatch) {
  throw new Error("legacy-source/index.html has no <body>");
}

const bodyAttrs = bodyMatch[1] ?? "";
const rawBody = bodyMatch[2] ?? "";
const body = rawBody
  .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2")
  .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, "$1$2");

const voidTags = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

const tokenRe = /<!--[^]*?-->|<![^>]*>|<\/?([A-Za-z][\w:-]*)(?:\s[^<>]*?)?\/?>/g;
let depth = 0;
let match;
const topLevel = [];

function summarizeAttrs(token) {
  const id = token.match(/\bid=["']([^"']+)["']/i)?.[1] ?? "";
  const className = token.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
  const dataElementorType = token.match(/\bdata-elementor-type=["']([^"']+)["']/i)?.[1] ?? "";
  return { id, className, dataElementorType };
}

while ((match = tokenRe.exec(body))) {
  const token = match[0];
  if (token.startsWith("<!--") || token.startsWith("<!")) continue;

  const tag = (match[1] ?? "").toLowerCase();
  if (!tag) continue;
  const closing = token.startsWith("</");
  const selfClosing = token.endsWith("/>") || voidTags.has(tag);

  if (closing) {
    depth = Math.max(0, depth - 1);
    continue;
  }

  if (depth === 0) {
    const attrs = summarizeAttrs(token);
    topLevel.push({ tag, ...attrs });
  }

  if (!selfClosing) depth += 1;
}

function count(pattern) {
  return (source.match(pattern) ?? []).length;
}

console.log("RESET SHOP LEGACY HOME STRUCTURE");
console.log(`body-bytes=${Buffer.byteLength(rawBody, "utf8")}`);
console.log(`body-attrs=${bodyAttrs.trim()}`);
console.log(`semantic-header=${count(/<header\b/gi)}`);
console.log(`semantic-main=${count(/<main\b/gi)}`);
console.log(`semantic-footer=${count(/<footer\b/gi)}`);
console.log(`elementor-header=${count(/elementor-location-header/gi)}`);
console.log(`elementor-footer=${count(/elementor-location-footer/gi)}`);
console.log(`elementor-sections=${count(/elementor-section/gi)}`);
console.log(`top-level-count=${topLevel.length}`);

for (const [index, item] of topLevel.slice(0, 80).entries()) {
  const parts = [`#${index + 1}`, `<${item.tag}>`];
  if (item.id) parts.push(`id=${JSON.stringify(item.id)}`);
  if (item.className) parts.push(`class=${JSON.stringify(item.className.slice(0, 220))}`);
  if (item.dataElementorType) parts.push(`elementor=${JSON.stringify(item.dataElementorType)}`);
  console.log(parts.join(" "));
}
