#!/usr/bin/env python3
"""Build real alpha-channel cutouts for verified OLIE'RE PARIS packshots.

Current "studio" photos are square because they contain their supplier's opaque
photographic backdrop. This script uses foreground segmentation on the exact,
verified product photos, never CSS blend modes or whole-image recoloring.

Usage:
  python scripts/isolate-oliere-packshots.py --apply
  python scripts/isolate-oliere-packshots.py --check

It preserves the original product photo (the input), and emits a separate
1000px transparent WebP with a predictable path. Only a fully validated
53-product map is written (52 exact SKUs, one marked needs_review).
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps
from rembg import new_session, remove

ROOT = Path("public/supplier-photos")
MAP_PATH = Path("data/supplier-photo-map.json")
DATA_PATH = Path("data/products.json")
OUTPUT = ROOT / "isolated"
REVISION = "u2net-v1"
TARGET = 1000
MAX_SUBJECT = (820, 835)

parser = argparse.ArgumentParser()
parser.add_argument("--apply", action="store_true")
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
rows = json.loads(DATA_PATH.read_text())
mapping = json.loads(MAP_PATH.read_text())
targets = [p for p in rows if p.get("brand") == "OLIE'RE PARIS" and p.get("status") == "active"]

report = {
    "revision": REVISION,
    "total": len(targets),
    "isolated": 0,
    "already_transparent": 0,
    "pending_review": [],
    "errors": [],
    "stats": [],
}


def inside_supplier_root(url: str) -> Path:
    if not isinstance(url, str) or not url.startswith("/supplier-photos/oliere-exact/"):
        raise ValueError("Must start from an exact verified supplier product photo")
    file = Path("public") / url.lstrip("/")
    if not file.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Source path outside supplier root")
    return file


def cutout(source: Image.Image, session):
    original = ImageOps.exif_transpose(source.convert("RGBA"))
    if max(original.size) > 1600:
        original.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    alpha = original.getchannel("A")
    alpha_values = alpha.histogram()
    transparent_share = sum(alpha_values[:15]) / max(1, original.width * original.height)
    if transparent_share >= .08:
        report["already_transparent"] += 1
        return original
    # Use the supplier image at its original resolution for segmentation.
    # No pre-scaling/cropping: the model needs to see the entire product(s).
    result = remove(original, session=session, alpha_matting=False, post_process_mask=True)
    if isinstance(result, bytes):
        result = Image.open(io.BytesIO(result))
    return result.convert("RGBA")


def normalize_foreground(image: Image.Image) -> tuple[Image.Image, dict]:
    alpha = image.getchannel("A")
    alpha_hist = alpha.histogram()
    pixels = image.width * image.height
    visible = sum(alpha_hist[20:])
    solid = sum(alpha_hist[200:])
    share = visible / pixels
    if not (.015 <= share <= .92):
        raise ValueError(f"Foreground coverage outside safe range: {share:.3f}")
    if solid < pixels * .012:
        raise ValueError("Insufficient solid foreground pixels")
    bbox = alpha.point(lambda v: 255 if v >= 20 else 0).getbbox()
    if not bbox:
        raise ValueError("Missing foreground after cutout")
    # Reject masks that contain virtually the full original rectangle.
    if bbox[0] < 2 and bbox[1] < 2 and bbox[2] > image.width - 2 and bbox[3] > image.height - 2 and share > .84:
        raise ValueError("Model appears to retain the entire rectangular background")
    rgba = image.crop(bbox)
    w, h = rgba.size
    scale = min(MAX_SUBJECT[0] / w, MAX_SUBJECT[1] / h)
    rgba = rgba.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
    # Hard-clip negligible alpha to avoid a ghostly square and oversaturated fringes.
    a = rgba.getchannel("A").point(lambda value: 0 if value < 8 else value)
    a = a.filter(ImageFilter.GaussianBlur(.4))
    rgba.putalpha(a)
    out = Image.new("RGBA", (TARGET, TARGET), (0, 0, 0, 0))
    out.alpha_composite(rgba, ((TARGET-rgba.width)//2, (TARGET-rgba.height)//2))
    qa = {
        "source_size": list(image.size),
        "foreground_share": round(share, 4),
        "solid_share": round(solid / pixels, 4),
        "bbox": list(bbox),
        "cutout_size": [rgba.width, rgba.height],
        "edge_alpha": list(out.getpixel((0,0))),
    }
    if out.getpixel((0,0))[3] != 0:
        raise ValueError("New cutout has opaque canvas corners")
    return out, qa


if len(targets) != 53:
    raise RuntimeError(f"Expected 53 active OLIE'RE items, got {len(targets)}")

if args.check:
    for item in targets:
        ref = mapping[item["slug"]]
        if ref.get("verification_status") == "needs_review":
            report["pending_review"].append(item["slug"])
            continue
        if ref.get("isolation_revision") != REVISION:
            report["errors"].append({"sku": item["sku"], "reason": "Not isolated"})
            continue
        url = ref.get("image_url")
        if url != "/supplier-photos/isolated/" + item["slug"] + ".webp":
            report["errors"].append({"sku": item["sku"], "reason": "Image reference mismatch"})
            continue
        target = Path("public") / url.lstrip("/")
        if not target.is_file():
            report["errors"].append({"sku": item["sku"], "reason": "Cutout file missing"})
            continue
        with Image.open(target) as im:
            if im.getextrema()[-1][0] != 0 or im.getextrema()[-1][1] != 255:
                report["errors"].append({"sku": item["sku"], "reason": "No usable transparency"})
                continue
        report["isolated"] += 1
else:
    session = new_session("u2net")
    to_write = []
    for item in targets:
        ref = mapping.get(item["slug"])
        if ref is None:
            report["errors"].append({"sku": item["sku"], "reason": "Missing photo map"})
            continue
        if ref.get("verification_status") == "needs_review":
            report["pending_review"].append(item["slug"])
            continue
        if ref.get("verified_by") != "exact_official_shopify_product_title_and_size":
            report["errors"].append({"sku": item["sku"], "reason": "Not an exact verified product"})
            continue
        try:
            source = inside_supplier_root(ref["source_asset_url"])
            with Image.open(source) as original:
                segment = cutout(original, session)
            transparent, metrics = normalize_foreground(segment)
            binary = io.BytesIO()
            transparent.save(binary, "WEBP", quality=91, method=5, exact=True)
            raw = binary.getvalue()
            to_write.append((item, ref, raw, metrics))
            report["stats"].append({"sku": item["sku"], "slug": item["slug"], "bytes": len(raw), **metrics})
            report["isolated"] += 1
            print(f"CUTOUT {item['sku']} alpha {metrics['foreground_share']:.2f} source {metrics['source_size']} -> {metrics['cutout_size']}", flush=True)
        except Exception as error:
            report["errors"].append({"sku": item["sku"], "reason": str(error)})

    if args.apply and not report["errors"] and report["isolated"] == 52 and len(report["pending_review"]) == 1:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for item, ref, binary, metrics in to_write:
            destination = OUTPUT / (item["slug"] + ".webp")
            destination.write_bytes(binary)
            ref["pre_isolation_image_url"] = ref.get("image_url")
            ref["image_url"] = "/supplier-photos/isolated/" + item["slug"] + ".webp"
            ref["isolation_revision"] = REVISION
            ref["isolation_sha256"] = hashlib.sha256(binary).hexdigest()
            ref["isolation_foreground_share"] = metrics["foreground_share"]
        MAP_PATH.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n")

Path("oliere-isolation-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print("SUMMARY", json.dumps({key: value for key, value in report.items() if key not in ("stats", "errors")}, ensure_ascii=False), flush=True)
if report["errors"] or report["isolated"] != 52 or len(report["pending_review"]) != 1:
    print("ERRORS", json.dumps(report["errors"], ensure_ascii=False)[:6000], flush=True)
    raise SystemExit(1)
