import { createElement, Fragment, type CSSProperties, type ReactNode } from "react";

import { nativeHeaderTree, type NativeHeaderNode } from "./native-header.generated";

const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  fetchpriority: "fetchPriority",
  srcset: "srcSet",
  usemap: "useMap",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
  autocomplete: "autoComplete",
  autocapitalize: "autoCapitalize",
  contenteditable: "contentEditable",
  spellcheck: "spellCheck",
  viewbox: "viewBox",
  preserveaspectratio: "preserveAspectRatio",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-width": "strokeWidth",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
};

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

function splitDeclarations(style: string) {
  const declarations: string[] = [];
  let current = "";
  let quote = "";
  let depth = 0;

  for (const character of style) {
    if (quote) {
      current += character;
      if (character === quote) quote = "";
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === "(") depth += 1;
    if (character === ")" && depth > 0) depth -= 1;

    if (character === ";" && depth === 0) {
      if (current.trim()) declarations.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) declarations.push(current);
  return declarations;
}

function cssPropertyToReact(property: string) {
  if (property.startsWith("--")) return property;

  const normalized = property.trim().toLowerCase();
  const camel = normalized.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return camel.startsWith("ms-") ? `ms${camel.slice(3, 4).toUpperCase()}${camel.slice(4)}` : camel;
}

function parseStyle(style: string): CSSProperties {
  const result: Record<string, string> = {};

  for (const declaration of splitDeclarations(style)) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;

    const property = declaration.slice(0, separator).trim();
    const value = declaration.slice(separator + 1).trim();
    if (!property || !value) continue;

    result[cssPropertyToReact(property)] = value;
  }

  return result as CSSProperties;
}

function toReactProps(attributes: Readonly<Record<string, string>>) {
  const props: Record<string, unknown> = {};

  for (const [rawName, value] of Object.entries(attributes)) {
    const lowerName = rawName.toLowerCase();

    // Inline DOM event strings belong to the removed WordPress runtime and are
    // intentionally not reintroduced into the React application.
    if (/^on[a-z]+$/.test(lowerName)) continue;

    if (lowerName === "style") {
      props.style = parseStyle(value);
      continue;
    }

    const propName = ATTRIBUTE_ALIASES[lowerName] ?? rawName;
    props[propName] = BOOLEAN_ATTRIBUTES.has(lowerName) ? true : value;
  }

  return props;
}

function renderNode(node: NativeHeaderNode, key: string): ReactNode {
  if (node.kind === "text") return node.value;

  if (node.kind === "element") {
    return createElement(
      node.tag,
      { ...toReactProps(node.attrs), key },
      ...node.children.map((child, index) => renderNode(child, `${key}.${index}`)),
    );
  }

  return null;
}

export function NativeHeader() {
  return createElement(
    Fragment,
    null,
    ...nativeHeaderTree.map((node, index) => renderNode(node, `header.${index}`)),
  );
}
