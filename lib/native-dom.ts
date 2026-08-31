export type NativeTextNode = {
  kind: "text";
  value: string;
};

export type NativeElementNode = {
  kind: "element";
  tag: string;
  attributes: Record<string, string>;
  children: NativeNode[];
};

export type NativeNode = NativeTextNode | NativeElementNode;

export function rewriteLegacyShopHost(value: string) {
  return value
    .replace(/https?:\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "")
    .replace(/\/\/shop\.resetclinic\.org(?=\/|[\"'])/gi, "");
}

export function domNodeToNative(node: any): NativeNode | null {
  if (!node) return null;

  if (node.type === "text") {
    return { kind: "text", value: rewriteLegacyShopHost(node.data ?? "") };
  }

  if (node.type === "comment") return null;

  const tag = node.name;
  if (!tag || typeof tag !== "string") return null;

  const attributes = Object.fromEntries(
    Object.entries(node.attribs ?? {}).map(([name, value]) => [
      name,
      rewriteLegacyShopHost(String(value ?? "")),
    ]),
  );

  const children = (node.children ?? [])
    .map((child: any) => domNodeToNative(child))
    .filter((child: NativeNode | null): child is NativeNode => child !== null);

  return {
    kind: "element",
    tag,
    attributes,
    children,
  };
}

export function domChildrenToNative(nodes: any[]): NativeNode[] {
  return nodes
    .map((node) => domNodeToNative(node))
    .filter((node: NativeNode | null): node is NativeNode => node !== null);
}
