#!/usr/bin/env python3
"""Read-only photo-background audit for CU SKIN sources.

Downloads a sample of verified official product photos; never writes to D1/R2.
Outputs source and proof-of-concept transparency as a GitHub Actions artifact.
The conversion here is a PREVIEW ONLY, never ready to auto-publish without QA.
"""
from collections import deque
from io import BytesIO
import json
import pathlib
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "data/cu-skin-official-snapshot.json").read_text())
OUT = pathlib.Path("cuskin-photo-preview")
OUT.mkdir(exist_ok=True)
SAMPLE_CODES = {"140", "235", "206", "255", "210", "232", "227", "239", "246", "102", "151", "284", "283", "288"}
CODES = {p["vendorCode"] for p in CATALOG["products"]}

def only_outer_white(img):
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    removed = 0
    while q:
        x, y = q.popleft()
        index = y * w + x
        if seen[index]:
            continue
        seen[index] = 1
        r, g, b, a = pixels[x, y]
        if a == 0:
            for xx, yy in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0 <= xx < w and 0 <= yy < h and not seen[yy*w+xx]:
                    q.append((xx, yy))
            continue
        if min(r, g, b) < 248 or max(r, g, b)-min(r, g, b) > 8:
            continue
        pixels[x, y] = (r, g, b, 0)
        removed += 1
        for xx, yy in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= xx < w and 0 <= yy < h and not seen[yy*w+xx]:
                q.append((xx, yy))
    return rgba, removed

rows = []
for product in CATALOG["products"]:
    code = product["vendorCode"]
    if code not in CODES:
        continue
    url = product["mainImage"]
    if not url.startswith("https://key.cu.ua/src/media/"):
        continue
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=16) as stream:
            data = stream.read(8_000_000)
        img = Image.open(BytesIO(data))
        img.load()
        original = img.convert("RGBA")
        alpha = original.getchannel("A")
        alpha_extrema = alpha.getextrema()
        corners = [original.getpixel((x,y)) for x,y in ((0,0),(original.width-1,0),(0,original.height-1),(original.width-1,original.height-1))]
        if code in SAMPLE_CODES:
            preview, removed = only_outer_white(original)
            original.save(OUT / f"{code}-before.png")
            preview.save(OUT / f"{code}-preview.png")
        else:
            removed = 0
        rows.append({"sku": f"300{code}", "name": product["name"],
                     "size": list(img.size), "mode": img.mode,
                     "alpha_extrema": alpha_extrema,
                     "corner_pixels": corners, "edge_removed_pixels": removed,
                     "removed_percent": round(removed / (img.width*img.height) * 100, 1)})
    except Exception as ex:
        rows.append({"sku": f"300{code}", "error": str(ex)[:200]})
(OUT / "report.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print("CU_BG_SUMMARY", json.dumps({
    "total": len(rows),
    "transparent_png": sum(1 for x in rows if x.get("alpha_extrema", [255])[0] == 0),
    "opaque_sources": [x.get("sku") for x in rows if x.get("alpha_extrema", [255])[0] > 0],
    "source_errors": [x for x in rows if "error" in x],
}, ensure_ascii=False))
for row in rows:
    if row.get("sku", "")[3:] in SAMPLE_CODES or "error" in row or row.get("alpha_extrema", [255])[0] > 0:
        print("CU_BG_SAMPLE", json.dumps(row, ensure_ascii=False))
