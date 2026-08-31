import fs from "node:fs";
import * as cheerio from "cheerio";

const sourcePath = new URL("../legacy-source/index.html", import.meta.url);
const outputPath = new URL("../components/shop/native-header.generated.ts", import.meta.url);

function rewriteShopHost(value) {
  return value
    .replace(/https?:\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "")
    .replace(/\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "");
}

function serializeNode(node) {
  if (node.type === "text") {
    return { kind: "text", value: node.data ?? "" };
  }

  if (node.type === "comment" || node.type === "directive") {
    return null;
  }

  const tag = node.name ?? node.tagName;
  if (!tag) return null;
  if (tag === "script" || tag === "noscript") return null;

  const attrs = Object.fromEntries(
    Object.entries(node.attribs ?? {}).map(([name, value]) => [
      name,
      rewriteShopHost(String(value ?? "")),
    ]),
  );

  const children = (node.children ?? [])
    .map(serializeNode)
    .filter(Boolean);

  return {
    kind: "element",
    tag,
    attrs,
    children,
  };
}

const source = fs.readFileSync(sourcePath, "utf8");
const $ = cheerio.load(source, { decodeEntities: false });
$("script, noscript").remove();

const header = $(".elementor-location-header").first();
if (!header.length) {
  throw new Error("Could not find .elementor-location-header in legacy-source/index.html");
}

const rootNode = header.get(0);
const tree = rootNode ? [serializeNode(rootNode)].filter(Boolean) : [];
if (!tree.length) {
  throw new Error("RESET Shop header could not be serialized");
}

const output = `/* eslint-disable */\n// AUTO-GENERATED from legacy-source/index.html.\n// The production React header consumes this static tree and does not parse legacy HTML at runtime.\n\nexport type NativeHeaderNode =\n  | { readonly kind: \"text\"; readonly value: string }\n  | {\n      readonly kind: \"element\";\n      readonly tag: string;\n      readonly attrs: Readonly<Record<string, string>>;\n      readonly children: readonly NativeHeaderNode[];\n    };\n\nexport const nativeHeaderTree = ${JSON.stringify(tree, null, 2)} as const satisfies readonly NativeHeaderNode[];\n`;

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generated native React header tree (${Buffer.byteLength(output)} bytes)`);
