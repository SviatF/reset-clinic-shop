#!/usr/bin/env python3
"""Create consistent e-commerce packshots without changing product identity.

Every source image is preserved, while a 1000x1000 transparent studio version is
placed in public/supplier-photos/studio and referenced from supplier-photo-map.
Run this AFTER all supplier downloads and workbook image extraction.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps, ImageStat

APPLY = "--apply" in sys.argv
PUBLIC = Path("public")
MAP = Path("data/supplier-photo-map.json")
PRODUCTS = Path("data/products.json")
SIZE = 1000
MAX_SUBJECT = (800, 825)
REVISION = "studio-v1"

rows = json.loads(PRODUCTS.read_text())
active = [row for row in rows if row.get("status") == "active"]
mapped = json.loads(MAP.read_text())
report = {"active": len(active), "normalized": 0, "preserved_isolated": 0, "backgrounds_removed": 0,
          "original_alpha": 0, "opaque_preserved": 0, "missing": [], "errors": [], "pending_review": []}


def source_path(url: str) -> Path:
    if not isinstance(url, str) or not url.startswith("/supplier-photos/"):
        raise ValueError("Not a local supplier asset: " + repr(url))
    candidate = PUBLIC / url.lstrip("/")
    if not candidate.resolve().is_relative_to((PUBLIC / "supplier-photos").resolve()):
        raise ValueError("Image path escapes supplier-photos")
    return candidate


def close(pixel: tuple[int, ...], background: tuple[int, ...], limit=22) -> bool:
    return max(abs(int(pixel[i]) - int(background[i])) for i in range(3)) <= limit


def strip_neutral_flat_background(image: Image.Image) -> tuple[Image.Image, bool]:
    """Remove *only* plain, edge-connected, near-white/black photographic backgrounds.

    Already-transparent artwork is left intact. Ambiguous photographs remain
    unchanged rather than risking white packaging or printed labels.
    """
    rgba = image.convert("RGBA")
    alpha_min = rgba.getchannel("A").getextrema()[0]
    if alpha_min < 250:
        report["original_alpha"] += 1
        return rgba, False

    width, height = rgba.size
    if min(width, height) < 60:
        return rgba, False
    corners = [rgba.getpixel((x, y))
               for x in (0, width - 1)
               for y in (0, height - 1)]
    average = tuple(round(sum(p[c] for p in corners) / 4) for c in range(3))
    is_white = min(average) >= 241
    is_black = max(average) <= 23
    if not (is_white or is_black) or not all(close(p, average, 16) for p in corners):
        return rgba, False

    stride = max(1, min(width, height) // 75)
    border = []
    for x in range(0, width, stride):
        border.extend((rgba.getpixel((x, 0)), rgba.getpixel((x, height - 1))))
    for y in range(0, height, stride):
        border.extend((rgba.getpixel((0, y)), rgba.getpixel((width - 1, y))))
    if sum(close(pixel, average, 22) for pixel in border) / max(1, len(border)) < .88:
        return rgba, False

    processed = rgba.copy()
    for xy in [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]:
        if processed.getpixel(xy)[3] > 200:
            ImageDraw.floodfill(processed, xy, (0, 0, 0, 0), thresh=20 if is_white else 14)
    bbox = processed.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    # If almost everything disappeared, refuse the background-removal operation.
    if not bbox:
        return rgba, False
    if (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) < width * height * .025:
        return rgba, False
    report["backgrounds_removed"] += 1
    return processed, True


def representative_frame(image: Image.Image) -> Image.Image:
    """Animated supplier assets may begin with a fully transparent hold frame."""
    if not getattr(image, "is_animated", False) or getattr(image, "n_frames", 1) <= 1:
        return image.copy()
    frames = image.n_frames
    picks = sorted(set([0, 1, 2, 4, 8, frames // 5, frames // 3,
                        frames // 2, (2 * frames) // 3, (4 * frames) // 5, frames - 1]))
    best, highest = None, -1
    for index in picks:
        if index < 0 or index >= frames:
            continue
        image.seek(index)
        frame = image.convert("RGBA")
        alpha = frame.getchannel("A")
        occupied = sum(alpha.histogram()[9:])
        if occupied == 0:
            continue
        # Prefer a real filled product frame, not a blank transparent intro.
        contrast = sum(ImageStat.Stat(frame.convert("RGB")).stddev)
        score = occupied + contrast * 90
        if score > highest:
            best, highest = frame.copy(), score
    if best is None:
        raise ValueError("No visible frame in supplier animation")
    return best


def studio_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(representative_frame(image))
    rgba, removed = strip_neutral_flat_background(image)
    if not removed and rgba.getchannel("A").getextrema()[0] >= 250:
        report["opaque_preserved"] += 1

    bbox = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        raise ValueError("Fully transparent source asset")
    content = rgba.crop(bbox)
    ratio = min(MAX_SUBJECT[0] / content.width, MAX_SUBJECT[1] / content.height)
    resized = content.resize((max(1, round(content.width * ratio)),
                              max(1, round(content.height * ratio))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    x = (SIZE - resized.width) // 2
    y = (SIZE - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


for product in active:
    slug = product["slug"]
    entry = mapped.get(slug)
    if entry and entry.get("verification_status") == "needs_review":
        report["pending_review"].append(slug)
        continue
    if entry and entry.get("isolation_revision") in ("u2net-v1", "isnet-clean-v2"):
        # Product-only transparent images must NEVER be replaced by old opaque
        # supplier photos during any bulk refresh.
        revision = entry["isolation_revision"]
        isolated_url = entry.get("image_url", "")
        allowed_prefix = "/supplier-photos/clean/" if revision == "isnet-clean-v2" else "/supplier-photos/isolated/"
        if not isolated_url.startswith(allowed_prefix):
            report["errors"].append({"slug": slug, "reason": "Mask revision mismatches local image URL"})
            continue
        isolated_file = source_path(isolated_url)
        if not isolated_file.is_file():
            report["errors"].append({"slug": slug, "reason": "Isolated asset is missing"})
            continue
        with Image.open(isolated_file) as existing:
            if existing.mode != "RGBA" or existing.getchannel("A").getextrema() != (0, 255):
                report["errors"].append({"slug": slug, "reason": "Isolated asset lacks real transparency"})
                continue
        report["preserved_isolated"] += 1
        continue
    if not entry:
        report["missing"].append({"slug": slug, "reason": "No verified source map"})
        continue
    # A later refresh may already point image_url to the studio derivative.
    original_url = entry.get("source_asset_url") or entry["image_url"]
    try:
        source = source_path(original_url)
        if not source.is_file():
            raise FileNotFoundError("Original photo missing: " + str(source))
        with Image.open(source) as image:
            studio = studio_image(image)
        dest = PUBLIC / "supplier-photos" / "studio" / (slug + ".webp")
        if APPLY:
            dest.parent.mkdir(parents=True, exist_ok=True)
            studio.save(dest, "WEBP", quality=89, method=5, exact=True)
            data = dest.read_bytes()
        else:
            import io
            buffer = io.BytesIO()
            studio.save(buffer, "WEBP", quality=89, method=5, exact=True)
            data = buffer.getvalue()
        entry["source_asset_url"] = original_url
        entry["image_url"] = "/supplier-photos/studio/" + slug + ".webp"
        entry["studio_revision"] = REVISION
        entry["studio_sha256"] = hashlib.sha256(data).hexdigest()
        report["normalized"] += 1
    except Exception as exc:
        report["errors"].append({"slug": slug, "reason": str(exc)})

if APPLY and not report["errors"] and not report["missing"]:
    MAP.write_text(json.dumps(mapped, ensure_ascii=False, indent=2) + "\n")
Path("supplier-studio-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: v for k, v in report.items() if k not in ("missing", "errors")}, ensure_ascii=False))
if report["errors"] or report["missing"]:
    print(json.dumps({"missing": report["missing"], "errors": report["errors"]}, ensure_ascii=False)[:3000])
    sys.exit(1)
if report["normalized"] + report["preserved_isolated"] + len(report["pending_review"]) != len(active):
    raise RuntimeError("Every active photo must be normalized or explicitly pending verification")
