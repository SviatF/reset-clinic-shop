import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE_ROOT = path.join(process.cwd(), "legacy-source");

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function safePath(...segments: string[]) {
  const candidate = path.resolve(SOURCE_ROOT, ...segments);
  if (candidate !== SOURCE_ROOT && !candidate.startsWith(`${SOURCE_ROOT}${path.sep}`)) {
    throw new Error("Unsafe legacy source path");
  }
  return candidate;
}

async function isFile(filePath: string) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function normalizeRouteSegments(segments: string[]) {
  return segments
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..");
}

export async function findLegacyDocument(segments: string[]) {
  const clean = normalizeRouteSegments(segments);
  const withoutIndex = clean.at(-1)?.toLowerCase() === "index.html" ? clean.slice(0, -1) : clean;

  const candidates = withoutIndex.length
    ? [
        safePath(...withoutIndex, "index.html"),
        safePath(`${withoutIndex.join("/")}.html`),
        clean.at(-1)?.toLowerCase().endsWith(".html") ? safePath(...clean) : null,
      ]
    : [safePath("index.html")];

  for (const candidate of candidates) {
    if (candidate && (await isFile(candidate))) return candidate;
  }

  return null;
}

function wrappedDownloadCandidate(segments: string[]) {
  const clean = normalizeRouteSegments(segments);
  if (!clean.length) return null;

  const last = clean.at(-1)!;
  const extension = path.extname(last);
  if (!extension) return null;

  const base = last.slice(0, -extension.length);
  const wrapped = `${base}_${extension.slice(1).toLowerCase()}.html`;
  return safePath(...clean.slice(0, -1), wrapped);
}

export async function findLegacyAsset(segments: string[]) {
  const clean = normalizeRouteSegments(segments);
  if (!clean.length) return null;

  const direct = safePath(...clean);
  if (await isFile(direct)) {
    const extension = path.extname(direct).toLowerCase();
    return {
      filePath: direct,
      contentType: MIME_BY_EXTENSION[extension],
      isHtml: extension === ".html",
      wrappedDownload: false,
    };
  }

  const wrapped = wrappedDownloadCandidate(clean);
  if (wrapped && (await isFile(wrapped))) {
    const requestedExtension = path.extname(clean.at(-1)!).toLowerCase();
    return {
      filePath: wrapped,
      contentType: MIME_BY_EXTENSION[requestedExtension] ?? "application/octet-stream",
      isHtml: false,
      wrappedDownload: true,
    };
  }

  return null;
}

function normalizeLegacyHtml(html: string) {
  return html
    .replace(/\s*has-mouse-dot\b/g, "")
    .replace(/\s*has-mouse-circle\b/g, "")
    .replace(/https?:\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "")
    .replace(/\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "");
}

export async function readLegacyDocument(filePath: string) {
  const html = normalizeLegacyHtml(await fs.readFile(filePath, "utf8"));

  return html.replace(
    /<\/head>/i,
    '<style id="reset-next-fidelity-fallback">html,body{cursor:auto!important}</style></head>',
  );
}

export type LegacyDocumentParts = {
  headHtml: string;
  bodyHtml: string;
  bodyClassName?: string;
  bodyId?: string;
};

export async function readLegacyRootDocumentParts(): Promise<LegacyDocumentParts> {
  const html = normalizeLegacyHtml(await fs.readFile(safePath("index.html"), "utf8"));
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);

  if (!bodyMatch) {
    throw new Error("Legacy RESET Shop root document has no <body>");
  }

  const bodyAttributes = bodyMatch[1] ?? "";
  const bodyClassName = bodyAttributes.match(/\bclass=["']([^"']*)["']/i)?.[1];
  const bodyId = bodyAttributes.match(/\bid=["']([^"']*)["']/i)?.[1];

  return {
    headHtml: `${headMatch?.[1] ?? ""}<style id="reset-next-fidelity-fallback">html,body{cursor:auto!important}</style>`,
    bodyHtml: bodyMatch[2],
    bodyClassName,
    bodyId,
  };
}

export async function readLegacyAsset(filePath: string, wrappedDownload = false) {
  const data = await fs.readFile(filePath);
  if (!wrappedDownload) return data;

  const bodyOpenMarker = Buffer.from("<body>");
  const bodyCloseMarker = Buffer.from("</body>");
  const bodyOpen = data.indexOf(bodyOpenMarker);
  const bodyClose = data.lastIndexOf(bodyCloseMarker);

  if (bodyOpen === -1 || bodyClose === -1 || bodyClose <= bodyOpen) {
    return data;
  }

  return data.subarray(bodyOpen + bodyOpenMarker.length, bodyClose);
}
