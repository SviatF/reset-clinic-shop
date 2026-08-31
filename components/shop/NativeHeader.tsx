import { createElement, Fragment, type CSSProperties, type ReactNode } from "react";
import type { NativeElementNode, NativeNode } from "../../lib/native-dom";

const BOOLEAN_ATTRIBUTES = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

const ATTRIBUTE_ALIASES: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  charset: "charSet",
  crossorigin: "crossOrigin",
  contenteditable: "contentEditable",
  datetime: "dateTime",
  fetchpriority: "fetchPriority",
  itemid: "itemID",
  itemprop: "itemProp",
  itemref: "itemRef",
  itemscope: "itemScope",
  itemtype: "itemType",
  maxlength: "maxLength",
  minlength: "minLength",
  referrerpolicy: "referrerPolicy",
  rowspan: "rowSpan",
  colspan: "colSpan",
  spellcheck: "spellCheck",
  srcset: "srcSet",
  tabindex: "tabIndex",
  usemap: "useMap",
  xlinkhref: "xlinkHref",
  "xlink:href": "xlinkHref",
  "xml:space": "xmlSpace",
};

function camelCaseAttribute(name: string) {
  const lower = name.toLowerCase();
  if (ATTRIBUTE_ALIASES[lower]) return ATTRIBUTE_ALIASES[lower];
  if (lower.startsWith("aria-") || lower.startsWith("data-")) return lower;
  if (lower.startsWith("on")) return null;

  return lower.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function cssPropertyName(name: string) {
  const trimmed = name.trim();
  if (trimmed.startsWith("--")) return trimmed;
  return trimmed
    .replace(/^-ms-/, "ms-")
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function parseInlineStyle(value: string): CSSProperties {
  const style: Record<string, string> = {};

  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = cssPropertyName(declaration.slice(0, separator));
    const propertyValue = declaration.slice(separator + 1).trim();
    if (!property || !propertyValue) continue;
    style[property] = propertyValue;
  }

  return style as CSSProperties;
}

function reactProps(node: NativeElementNode, key: string | number) {
  const props: Record<string, unknown> = { key };

  for (const [rawName, value] of Object.entries(node.attributes)) {
    const lower = rawName.toLowerCase();
    const name = camelCaseAttribute(rawName);
    if (!name) continue;

    if (lower === "style") {
      props.style = parseInlineStyle(value);
      continue;
    }

    if (BOOLEAN_ATTRIBUTES.has(lower)) {
      props[name] = value === "" || value.toLowerCase() === lower || value.toLowerCase() === "true";
      continue;
    }

    props[name] = value;
  }

  return props;
}

function renderNode(node: NativeNode, key: string | number): ReactNode {
  if (node.kind === "text") return node.value;

  return createElement(
    node.tag,
    reactProps(node, key),
    ...node.children.map((child, index) => renderNode(child, `${key}.${index}`)),
  );
}

type NativeHeaderProps = {
  nodes: NativeNode[];
};

export function NativeHeader({ nodes }: NativeHeaderProps) {
  return createElement(
    Fragment,
    null,
    ...nodes.map((node, index) => renderNode(node, `header.${index}`)),
  );
}
