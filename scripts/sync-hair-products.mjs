import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const shopDataDir = process.env.SHOP_DATA_DIR?.trim();

if (!shopDataDir) {
  console.error("SHOP_DATA_DIR is not configured");
  process.exit(1);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const source = [
  ...readJson(path.join(repoRoot, "data/hair-products-1.json")),
  ...readJson(path.join(repoRoot, "data/hair-products-2.json")),
  ...readJson(path.join(repoRoot, "data/hair-products-3.json")),
];
const baseSeed = readJson(path.join(repoRoot, "data/products.json"));
const importedAt = "2026-09-03T00:00:00.000Z";

function hover(name) {
  const value = name.toLowerCase();
  if (value.includes("набір")) return ["КОМПЛЕКСНИЙ ДОГЛЯД", "Повна система", "Кілька етапів в одному наборі"];
  if (value.includes("шампун")) return ["ПРИЗНАЧЕННЯ", "Очищення + догляд", "Для професійної рутини волосся"];
  if (value.includes("маска") && !value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Живлення + відновлення", "Для довжини та якості волосся"];
  if (value.includes("спрей")) return ["ПРИЗНАЧЕННЯ", "Захист + керованість", "Незмивний догляд для волосся"];
  if (value.includes("сироват")) return ["ПРИЗНАЧЕННЯ", "Блиск + захист", "Фінішний догляд без обтяження"];
  if (value.includes("кондиціон")) return ["ПРИЗНАЧЕННЯ", "М’якість + розгладження", "Після очищення волосся"];
  if (value.includes("віск") || value.includes("гель") || value.includes("мус") || value.includes("лак")) return ["СТАЙЛІНГ", "Форма + фіксація", "Професійний контроль укладки"];
  return ["ДОГЛЯД ЗА ВОЛОССЯМ", "Професійний догляд", "OLIE'RE PARIS"];
}

const imported = source.map((item, index) => {
  const number = String(index + 1).padStart(3, "0");
  const [hoverLabel, hoverTitle, hoverText] = hover(item.name);
  return {
    id: `oliere_hair_${number}`,
    slug: item.slug,
    name: item.name,
    brand: "OLIE'RE PARIS",
    sku: `OLIERE-${number}`,
    category: "hair",
    status: "active",
    short_description: item.short,
    description: item.short,
    price: Number(item.price),
    currency: "UAH",
    stock_quantity: 0,
    track_stock: false,
    size: item.size || null,
    image_url: item.image || null,
    secondary_image_url: null,
    hover_label: hoverLabel,
    hover_title: hoverTitle,
    hover_text: hoverText,
    how_to_use: null,
    key_ingredients: [],
    inci: null,
    seo_title: `${item.name} — купити в RESET Clinic`,
    seo_description: `${item.short}. OLIE'RE PARIS у RESET Clinic з доставкою по Україні.`,
    seo_keywords: ["OLIE'RE PARIS", "професійна косметика для волосся", "догляд за волоссям"],
    featured: false,
    sort_order: index + 1,
    published_at: importedAt,
    created_at: importedAt,
    updated_at: importedAt,
  };
});

fs.mkdirSync(shopDataDir, { recursive: true });
const target = path.join(shopDataDir, "products.json");
let current = baseSeed;
if (fs.existsSync(target)) {
  current = readJson(target);
  fs.copyFileSync(target, `${target}.backup-${Date.now()}`);
}

const nonHair = Array.isArray(current) ? current.filter((item) => item?.category !== "hair") : baseSeed;
const next = [...nonHair, ...imported];
const temporary = `${target}.tmp-${process.pid}`;
fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
fs.renameSync(temporary, target);

console.log(`Synced ${imported.length} OLIE'RE hair products to ${target}`);
console.log(`Preserved ${nonHair.length} non-hair products`);
