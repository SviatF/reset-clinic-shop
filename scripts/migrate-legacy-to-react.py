#!/usr/bin/env python3
"""One-time migration of saved RESET documents into React-renderable data.

The output intentionally contains no HTML strings or HTML documents. Each
element is represented as a typed node consumed by the native React renderer.
Repeated CSS is deduplicated into hashed chunks and embedded data-URI images
are extracted into normal files under public/native-assets.
"""

from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import unquote_to_bytes, urlsplit
from collections import Counter

from lxml import etree, html


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = REPO_ROOT / "legacy-source"
OUTPUT_ROOT = REPO_ROOT / "content" / "native"
ROUTES_ROOT = OUTPUT_ROOT / "routes"
STYLES_ROOT = OUTPUT_ROOT / "styles"
ASSETS_ROOT = REPO_ROOT / "public" / "native-assets"
PUBLIC_STYLES_ROOT = REPO_ROOT / "public" / "native-styles"

SHOP_HOST_PATTERN = re.compile(r"(?:https?:)?//shop\.resetclinic\.org", re.I)
BASE64_DATA_PATTERN = re.compile(
    r"data:(?P<mime>(?:image|font)/[a-z0-9.+-]+);base64,(?P<data>[a-z0-9+/=\r\n]+)",
    re.I,
)
SVG_DATA_PATTERN = re.compile(
    r"data:(?P<mime>image/svg\+xml)(?:;charset=[^,;]+)?,(?P<data>[^)\"']+)",
    re.I,
)

EXCLUDED_ROUTE_PREFIXES = ("/product/", "/product-category/", "/shop/")
EXCLUDED_EXACT_ROUTES = {"/shop/"}

REMOVED_TAGS = {"script", "noscript", "style", "link", "meta", "title"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "source", "track", "wbr"}


def digest(data: bytes, length: int = 16) -> str:
    return hashlib.sha256(data).hexdigest()[:length]


def route_from_file(path: Path) -> str:
    relative = path.relative_to(SOURCE_ROOT)
    if relative == Path("index.html"):
        return "/"
    parts = list(relative.parts[:-1])
    return "/" + "/".join(parts) + "/"


def route_file_name(route: str) -> str:
    label = route.strip("/").replace("/", "--") or "home"
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", label).strip("-")
    return f"{safe}-{digest(route.encode(), 10)}.json"


def extension_for_mime(mime: str) -> str:
    overrides = {
        "image/jpeg": ".jpg",
        "image/svg+xml": ".svg",
        "image/x-icon": ".ico",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "font/ttf": ".ttf",
        "font/otf": ".otf",
    }
    return overrides.get(mime.lower(), mimetypes.guess_extension(mime.lower()) or ".bin")


def save_asset(mime: str, payload: bytes) -> str:
    name = f"{digest(payload, 24)}{extension_for_mime(mime)}"
    target = ASSETS_ROOT / name
    if not target.exists():
        target.write_bytes(payload)
    return f"/native-assets/{name}"


def replace_data_uris(value: str) -> str:
    def base64_replacement(match: re.Match[str]) -> str:
        compact = re.sub(r"\s+", "", match.group("data"))
        try:
            payload = base64.b64decode(compact, validate=False)
        except Exception:
            return match.group(0)
        return save_asset(match.group("mime"), payload)

    def svg_replacement(match: re.Match[str]) -> str:
        try:
            payload = unquote_to_bytes(match.group("data"))
        except Exception:
            return match.group(0)
        return save_asset(match.group("mime"), payload)

    value = BASE64_DATA_PATTERN.sub(base64_replacement, value)
    return SVG_DATA_PATTERN.sub(svg_replacement, value)


def normalize_reference(value: str, current_route: str) -> str:
    value = replace_data_uris(value)
    value = SHOP_HOST_PATTERN.sub("", value)

    if value.startswith(("data:", "mailto:", "tel:", "#", "javascript:")):
        return value

    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return value

    path = parsed.path
    suffix = ""
    if parsed.query:
        suffix += f"?{parsed.query}"
    if parsed.fragment:
        suffix += f"#{parsed.fragment}"

    if not path:
        return suffix or value

    path = path.replace("\\", "/")
    path = re.sub(r"(?:^|/)index\.html$", "/", path, flags=re.I)
    path = re.sub(r"\.html$", "/", path, flags=re.I)

    if path.startswith("/"):
        normalized = re.sub(r"/+", "/", path)
    else:
        base = current_route if current_route.endswith("/") else f"{current_route}/"
        parts = [part for part in (base + path).split("/") if part and part != "."]
        resolved: list[str] = []
        for part in parts:
            if part == "..":
                if resolved:
                    resolved.pop()
            else:
                resolved.append(part)
        normalized = "/" + "/".join(resolved)
        if path.endswith("/") or path.lower().endswith("index.html"):
            normalized += "/"

    return normalized + suffix


def normalize_attribute(name: str, value: str, current_route: str) -> str:
    value = replace_data_uris(value)
    value = SHOP_HOST_PATTERN.sub("", value)
    if name.lower() in {"href", "src", "action", "poster", "data-src"}:
        return normalize_reference(value, current_route)
    return value


def native_text(value: str | None) -> dict[str, str] | None:
    if value is None or value == "":
        return None
    return {"kind": "text", "value": SHOP_HOST_PATTERN.sub("", value)}


def element_to_native(element: etree._Element, current_route: str) -> dict[str, Any] | None:
    if not isinstance(element.tag, str):
        return None

    tag = element.tag.lower()
    if tag in REMOVED_TAGS:
        return None

    attributes: dict[str, str] = {}
    for raw_name, raw_value in element.attrib.items():
        name = str(raw_name)
        if name.lower().startswith("on"):
            continue
        attributes[name] = normalize_attribute(name, str(raw_value), current_route)

    class_names = attributes.get("class", "").split()
    if "elementor-menu-cart__toggle_button" in class_names:
        attributes["href"] = "/cart/"

    children: list[dict[str, Any]] = []
    first_text = native_text(element.text)
    if first_text:
        children.append(first_text)

    for child in element:
        converted = element_to_native(child, current_route)
        if converted:
            children.append(converted)
        tail = native_text(child.tail)
        if tail:
            children.append(tail)

    return {
        "kind": "element",
        "tag": tag,
        "attributes": attributes,
        "children": children,
    }


def remove_element(element: etree._Element) -> None:
    parent = element.getparent()
    if parent is None:
        return
    if element.tail:
        previous = element.getprevious()
        if previous is not None:
            previous.tail = (previous.tail or "") + element.tail
        else:
            parent.text = (parent.text or "") + element.tail
    parent.remove(element)


def strip_runtime_and_products(document: etree._Element) -> None:
    for element in list(document.xpath("//script|//noscript")):
        remove_element(element)

    product_xpaths = [
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' products ')]",
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' elementor-widget-woocommerce-products ')]",
        "//*[contains(concat(' ', normalize-space(@class), ' '), ' related ') and contains(concat(' ', normalize-space(@class), ' '), ' products ')]",
    ]
    seen: set[int] = set()
    for expression in product_xpaths:
        for element in list(document.xpath(expression)):
            marker = id(element)
            if marker in seen:
                continue
            seen.add(marker)
            remove_element(element)


def body_nodes(
    document: etree._Element,
    route: str,
    remove_header_footer: bool = True,
) -> list[dict[str, Any]]:
    body = document.find("body")
    if body is None:
        raise RuntimeError(f"Document for {route} has no body")

    if remove_header_footer:
        landmarks = document.xpath(
            "//*[contains(concat(' ',normalize-space(@class),' '),' elementor-location-header ')]"
            "|//*[@id='main-footer']|//footer"
        )
        for element in list(landmarks):
            remove_element(element)

    nodes: list[dict[str, Any]] = []
    head_text = native_text(body.text)
    if head_text:
        nodes.append(head_text)
    for child in body:
        converted = element_to_native(child, route)
        if converted:
            nodes.append(converted)
        tail = native_text(child.tail)
        if tail:
            nodes.append(tail)
    return nodes


def extract_landmark(document: etree._Element, xpath: str, route: str) -> list[dict[str, Any]]:
    matches = document.xpath(xpath)
    if not matches:
        raise RuntimeError(f"Missing landmark {xpath}")
    converted = element_to_native(matches[0], route)
    if not converted:
        raise RuntimeError(f"Could not convert landmark {xpath}")
    return [converted]


def style_resources(document: etree._Element) -> list[dict[str, str]]:
    resources: list[dict[str, str]] = []
    for element in document.xpath("//style"):
        css = replace_data_uris(element.text or "")
        media = element.get("media") or ""
        payload = f"{media}\0{css}".encode()
        key = digest(payload, 24)
        target = STYLES_ROOT / f"{key}.css"
        if not target.exists():
            target.write_text(css, encoding="utf-8")
        resources.append({"key": key, "media": media})
    return resources


def stylesheet_links(document: etree._Element, route: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for element in document.xpath("//link[@href]"):
        relation = (element.get("rel") or "").lower()
        if "stylesheet" not in relation:
            continue
        item = {
            "href": normalize_reference(element.get("href") or "", route),
            "rel": relation or "stylesheet",
        }
        if element.get("media"):
            item["media"] = element.get("media") or ""
        links.append(item)
    return links


def page_title(document: etree._Element) -> str:
    titles = document.xpath("//title")
    if not titles:
        return "RESET Clinic Shop"
    value = " ".join(titles[0].text_content().split())
    return value or "RESET Clinic Shop"


def load_document(path: Path) -> etree._Element:
    parser = html.HTMLParser(encoding="utf-8", recover=True, huge_tree=True)
    return html.fromstring(path.read_bytes(), parser=parser)


def is_snapshot_route(route: str) -> bool:
    if route in EXCLUDED_EXACT_ROUTES:
        return False
    return not any(route.startswith(prefix) for prefix in EXCLUDED_ROUTE_PREFIXES)


def main() -> None:
    if not SOURCE_ROOT.exists():
        raise SystemExit("legacy-source is missing; migration has already been finalized")

    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    if ASSETS_ROOT.exists():
        shutil.rmtree(ASSETS_ROOT)
    if PUBLIC_STYLES_ROOT.exists():
        shutil.rmtree(PUBLIC_STYLES_ROOT)
    ROUTES_ROOT.mkdir(parents=True)
    STYLES_ROOT.mkdir(parents=True)
    ASSETS_ROOT.mkdir(parents=True)
    PUBLIC_STYLES_ROOT.mkdir(parents=True)

    manifest: dict[str, dict[str, Any]] = {}
    source_pages = sorted(SOURCE_ROOT.rglob("index.html"))

    home_document = load_document(SOURCE_ROOT / "index.html")
    strip_runtime_and_products(home_document)
    home_route = "/"
    shell = {
        "header": extract_landmark(
            home_document,
            "//*[contains(concat(' ',normalize-space(@class),' '),' elementor-location-header ')]",
            home_route,
        ),
        "footer": extract_landmark(
            home_document,
            "//*[@id='main-footer']|//footer",
            home_route,
        ),
    }
    (OUTPUT_ROOT / "shell.json").write_text(
        json.dumps(shell, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    for source in source_pages:
        route = route_from_file(source)
        if not is_snapshot_route(route):
            continue

        document = load_document(source)
        strip_runtime_and_products(document)
        body = document.find("body")
        if body is None:
            raise RuntimeError(f"Missing body: {source}")

        route_file = route_file_name(route)
        payload = {
            "nodes": body_nodes(document, route),
        }
        (ROUTES_ROOT / route_file).write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

        manifest[route] = {
            "file": route_file,
            "title": page_title(document),
            "bodyClassName": body.get("class") or "",
            "bodyId": body.get("id") or "",
            "styles": style_resources(document),
            "links": stylesheet_links(document, route),
        }
        print(f"migrated {route}")

    # Most pages share the same large WordPress/Elementor base. Publish that
    # once and keep only the genuinely route-specific cascade in the second
    # stylesheet. This preserves the visual CSS without 39 copies of it.
    usage = Counter(
        style["key"]
        for page in manifest.values()
        for style in page["styles"]
    )
    common_threshold = max(2, (len(manifest) * 3 + 3) // 4)
    common_keys = {key for key, count in usage.items() if count >= common_threshold}

    def css_for_entries(entries: list[dict[str, str]]) -> str:
        parts: list[str] = []
        for entry in entries:
            css = (STYLES_ROOT / f"{entry['key']}.css").read_text(encoding="utf-8")
            media = entry.get("media", "")
            if media and media.lower() != "all":
                parts.append(f"@media {media}{{{css}}}")
            else:
                parts.append(css)
        return "\n".join(parts)

    common_order: list[dict[str, str]] = []
    seen_common: set[str] = set()
    for page in manifest.values():
        for entry in page["styles"]:
            if entry["key"] in common_keys and entry["key"] not in seen_common:
                common_order.append(entry)
                seen_common.add(entry["key"])
    (PUBLIC_STYLES_ROOT / "common.css").write_text(
        css_for_entries(common_order),
        encoding="utf-8",
    )

    for route, page in manifest.items():
        specific = [entry for entry in page["styles"] if entry["key"] not in common_keys]
        stylesheets = ["/native-styles/common.css"]
        if specific:
            name = f"{digest(route.encode(), 16)}.css"
            (PUBLIC_STYLES_ROOT / name).write_text(css_for_entries(specific), encoding="utf-8")
            stylesheets.append(f"/native-styles/{name}")
        page["stylesheets"] = stylesheets
        del page["styles"]

    shutil.rmtree(STYLES_ROOT)

    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    route_bytes = sum(path.stat().st_size for path in ROUTES_ROOT.glob("*.json"))
    style_bytes = sum(path.stat().st_size for path in PUBLIC_STYLES_ROOT.glob("*.css"))
    asset_bytes = sum(path.stat().st_size for path in ASSETS_ROOT.iterdir())
    print(
        f"complete: routes={len(manifest)} route_bytes={route_bytes} "
        f"style_bytes={style_bytes} asset_bytes={asset_bytes}"
    )


if __name__ == "__main__":
    main()
