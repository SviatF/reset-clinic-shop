#!/usr/bin/env python3
"""Recover exact OLIE'RE Studio bundle photo from a live product page.

Match exact Shopify product title and product URL before downloading its
featured image. Save original content as-is except efficient WebP encoding;
NO subject cutouts, upscaling, hallucinated packaging or guessed media.
"""
import json
import hashlib
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

REPO=Path(__file__).resolve().parents[1]
SLUG="profesiinyi-nabir-dlia-ukladannia-volossia-studio-olie-re-paris"
PAGE="https://pinkygreen.shop/collections/studio/products/profesiynyy-nabir-dlya-ukladannya-volossya-studio-oliere-paris.js"
EXPECTED="Професійний набір для укладання волосся Studio OLIE'RE PARIS"
TARGET=REPO/"public/supplier-photos/oliere/studio-professional-styling-bundle.webp"
MAP=REPO/"data/supplier-photo-map.json"
def get(url):
    req=Request(url,headers={"User-Agent":"RESET Shop vendor-image verification / 1.0"})
    with urlopen(req,timeout=18) as response:
        return response.read(8_000_000)
item=json.loads(get(PAGE))
assert item.get("title","").strip()==EXPECTED, "Source title mismatch"
image=item.get("featured_image","")
assert image.startswith("//cdn.shopify.com/s/files/1/0673/9777/9643/files/"), "Unexpected Shopify image host/path"
url="https:"+image
data=get(url)
assert 20000<len(data)<8_000_000
photo=Image.open(BytesIO(data));photo.load()
assert photo.width>=600 and photo.height>=600 and max(photo.size)<=7000
photo=ImageOps.exif_transpose(photo)
if photo.mode not in ("RGB","RGBA"):
    photo=photo.convert("RGBA" if "A" in photo.getbands() or "transparency" in photo.info else "RGB")
TARGET.parent.mkdir(parents=True,exist_ok=True)
photo.save(TARGET,"WEBP",quality=92,method=6)
mapping=json.loads(MAP.read_text())
record=mapping[SLUG]
assert record.get("image_url") in (None,"/supplier-photos/oliere/studio-professional-styling-bundle.webp")
record.update({
    "image_url":"/supplier-photos/oliere/studio-professional-styling-bundle.webp",
    "verification_status":"matched_exact_product_title",
    "verified_page":PAGE.replace(".js",""),
    "verified_supplier_title":EXPECTED,
    "retrieved_image_source":url,
    "retrieved_sha256": hashlib.sha256(TARGET.read_bytes()).hexdigest()
})
MAP.write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+"\n")
print("RECOVERED_STUDIO",json.dumps({
    "title":item["title"],"image_dimensions":photo.size,"mode":photo.mode,
    "source":url,"bytes":TARGET.stat().st_size,"target":str(TARGET.relative_to(REPO))
},ensure_ascii=False))
