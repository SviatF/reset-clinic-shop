process.env.NODE_ENV = process.env.NODE_ENV || "production";

const fs = require("fs");
const http = require("http");
const path = require("path");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const SERVER_VERSION = "2026-09-03-pki-v2";
const CITYHOST_VALIDATION_PREFIX = "/.well-known/pki-validation/";
const CITYHOST_VALIDATION_BODY = "shop.resetclinic.org _1mcz6j2m6btyyoh3peyk1ghdlhvhedw";

function listenTarget() {
  const raw = process.env.PORT || "3001";
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && String(numeric) === String(raw).trim()) {
    return { target: numeric, isSocket: false };
  }
  return { target: raw, isSocket: true };
}

function serveValidation(req, res, pathname) {
  const filename = path.basename(pathname);
  const publicFile = path.join(
    process.cwd(),
    "public",
    ".well-known",
    "pki-validation",
    filename,
  );

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Reset-Server-Version", SERVER_VERSION);

  if (req.method === "HEAD") return res.end();

  if (fs.existsSync(publicFile) && fs.statSync(publicFile).isFile()) {
    return fs.createReadStream(publicFile).pipe(res);
  }

  if (filename === "fileauth.txt") {
    return res.end(`${CITYHOST_VALIDATION_BODY}\n`);
  }

  res.statusCode = 404;
  return res.end("Not found\n");
}

app.prepare().then(() => {
  const { target, isSocket } = listenTarget();
  if (isSocket && fs.existsSync(target)) fs.unlinkSync(target);

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (pathname === "/__server-health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify({ ok: true, version: SERVER_VERSION }));
    }

    if (pathname.startsWith(CITYHOST_VALIDATION_PREFIX)) {
      return serveValidation(req, res, pathname);
    }

    res.setHeader("X-Reset-Server-Version", SERVER_VERSION);
    return handle(req, res);
  });

  server.listen(target, isSocket ? undefined : "0.0.0.0", () => {
    if (isSocket) {
      try {
        fs.chmodSync(target, "0777");
      } catch (error) {
        console.warn("Could not chmod Node.js socket:", error instanceof Error ? error.message : error);
      }
    }
    console.log(`RESET Shop Next.js server ${SERVER_VERSION} listening on ${isSocket ? `socket ${target}` : `port ${target}`}`);
  });
});
