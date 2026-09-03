process.env.NODE_ENV = process.env.NODE_ENV || "production";

const fs = require("fs");
const http = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const CITYHOST_VALIDATION_PATH = "/.well-known/pki-validation/fileauth.txt";
const CITYHOST_VALIDATION_BODY = "shop.resetclinic.org _1mcz6j2m6btyyoh3peyk1ghdlhvhedw";

function listenTarget() {
  const raw = process.env.PORT || "3001";
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && String(numeric) === String(raw).trim()) {
    return { target: numeric, isSocket: false };
  }
  return { target: raw, isSocket: true };
}

app.prepare().then(() => {
  const { target, isSocket } = listenTarget();
  if (isSocket && fs.existsSync(target)) fs.unlinkSync(target);

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (pathname === CITYHOST_VALIDATION_PATH) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      if (req.method === "HEAD") return res.end();
      return res.end(`${CITYHOST_VALIDATION_BODY}\n`);
    }

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
    console.log(`RESET Shop Next.js server listening on ${isSocket ? `socket ${target}` : `port ${target}`}`);
  });
});
