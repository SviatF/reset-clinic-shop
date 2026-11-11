/** Supplier-model names verified against the Braderm catalog sheet.
 * Presentation-only: existing D1 records, prices, stock and orders are untouched. */
const bradermModels: Record<string, string> = {
  "braderm-kurac-mousse-2": "Kurac mousse",
  "braderm-azn-cream-3": "AZN cream",
  "braderm-kurac-cream-4": "Kurac cream",
  "braderm-dorsak-spray-5": "Dorsak spray",
  "braderm-tramexal-cream-6": "Tramexal cream",
  "braderm-rosac-cream-7": "Rosac cream",
  "braderm-oxage-cream-8": "Oxage cream",
  "braderm-kurage-cream-9": "Kurage cream",
  "braderm-kerato-psor-10": "Kerato psor",
  "braderm-axatopic-cleanser-11": "Axatopic cleanser",
  "braderm-axatopic-cream-12": "Axatopic cream",
};

export function productModelBySlug(slug: string): string {
  return bradermModels[slug] || "";
}

export function productDisplayName(product: { slug: string; name: string; brand: string }): string {
  const name = product.name.trim();
  const model = productModelBySlug(product.slug);
  if (!model || name.toLocaleLowerCase("uk").includes(model.toLocaleLowerCase("uk"))) return name;
  return `Braderm ${model} — ${name.replace(/^Braderm\s+/i, "").trim()}`;
}

/** Preview at a sentence boundary, never at an arbitrary character count. */
export function productIntro(fullText: string): string {
  const text = fullText.trim();
  if (!text) return "";
  const firstSentence = text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0] || text;
  if (firstSentence.length <= 280) return firstSentence;
  const words = firstSentence.slice(0, 240).replace(/\s+\S*$/u, "").trim();
  return `${words || firstSentence.slice(0, 240)}…`;
}
