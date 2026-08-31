import fs from "node:fs";
import * as cheerio from "cheerio";

const sourcePath = new URL("../legacy-source/index.html", import.meta.url);
const outputPath = new URL("../components/shop/native-header.snapshot.html", import.meta.url);

const source = fs.readFileSync(sourcePath, "utf8");
const $ = cheerio.load(source, { decodeEntities: false });
const header = $('[data-elementor-type="header"]').first();

if (!header.length) {
  throw new Error("Could not find the Elementor header in legacy-source/index.html");
}

const html = $.html(header);
fs.writeFileSync(outputPath, `${html}\n`, "utf8");
console.log(`Extracted native header snapshot (${Buffer.byteLength(html)} bytes)`);
