#!/usr/bin/env python3
"""Compose accurate OLIE'RE kits from verified individual official product photos.

Group-scene foreground extraction is banned for these kits: it left hanging
shadows, missing labels, and random holes in bottle logos. This builds each kit
from original independently verified product SKUs, placing all packages on a
consistent baseline on a 1000x1000 truly transparent canvas.

The supplier's group photo is retained for comparison and provenance.
Generate only:
    python scripts/render-oliere-bundles.py --apply
Validate:
    python scripts/render-oliere-bundles.py --check
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser()
parser.add_argument("--apply",action="store_true")
parser.add_argument("--check",action="store_true")
args=parser.parse_args()
if args.apply and args.check: raise SystemExit("Choose --apply or --check")

ROOT=Path("public/supplier-photos")
OUT=ROOT/"bundles"
MAP_FILE=Path("data/supplier-photo-map.json")
PRODUCTS_FILE=Path("data/products.json")
MANIFEST_FILE=Path("data/oliere-bundle-compositions.json")
REVISION="composite-v1"

items=json.loads(PRODUCTS_FILE.read_text())
by_sku={item["sku"]:item for item in items}
mapping=json.loads(MAP_FILE.read_text())
manifest=json.loads(MANIFEST_FILE.read_text())
sets=manifest["sets"]
assert len(sets)==14 and len({s["sku"] for s in sets})==14, "Unexpected bundle manifest"
assert manifest["revision"]==REVISION
report={"revision":REVISION,"bundles":len(sets),"rendered":0,"checked":0,"errors":[],"products":[]}
staged=[]

def trusted_asset(url):
    if not isinstance(url,str) or not url.startswith("/supplier-photos/"):
        raise ValueError("Media URL is not a local supplier asset")
    filepath=Path("public")/url.lstrip("/")
    if not filepath.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError("Media URL escapes supplier photos")
    if not filepath.is_file():
        raise FileNotFoundError(str(filepath))
    return filepath

def verified_product_photo(sku):
    p=by_sku[sku]
    if p["brand"]!="OLIE'RE PARIS" or p["status"]!="active":
        raise ValueError("Not an active OLIE'RE product "+sku)
    if p["name"].lower().startswith(("набір","професійний набір","комбо","комбінований","комплексний")):
        raise ValueError("Bundles cannot be composited from other bundles "+sku)
    ref=mapping[p["slug"]]
    if ref.get("verified_by")!="exact_official_shopify_product_title_and_size":
        raise ValueError("Ingredient product photo unverified: "+sku)
    if not str(ref.get("source_product_url","")).startswith("https://oliere.paris/products/"):
        raise ValueError("Ingredient not linked to original official product: "+sku)
    url=ref.get("image_url")
    if not url or not url.startswith("/supplier-photos/clean/"):
        raise ValueError("Ingredient must be the independently cleaned single-SKU image: "+sku)
    with Image.open(trusted_asset(url)) as image:
        rgba=image.convert("RGBA")
        alpha=rgba.getchannel("A")
        if alpha.getextrema()!=(0,255):
            raise ValueError("Ingredient lacks true background transparency: "+sku)
        bbox=alpha.point(lambda a:255 if a>=20 else 0).getbbox()
        if not bbox: raise ValueError("Ingredient has empty alpha silhouette: "+sku)
        return rgba.crop(bbox)

def compose(spec):
    p=by_sku[spec["sku"]]
    if p["status"]!="active" or p["brand"]!="OLIE'RE PARIS":
        raise ValueError("Unexpected bundle SKU "+spec["sku"])
    ref=mapping[p["slug"]]
    if ref.get("verified_by")!="exact_official_shopify_product_title_and_size":
        raise ValueError("Bundle not verified against supplier: "+spec["sku"])
    if not ref.get("source_product_url","").startswith("https://oliere.paris/products/"):
        raise ValueError("Bundle is not linked to the official supplier: "+spec["sku"])
    if not (2<=len(spec["layers"])<=6):
        raise ValueError("Unexpected bundle composition size: "+spec["sku"])
    if len({a["sku"] for a in spec["layers"]})!=len(spec["layers"]):
        raise ValueError("Duplicated ingredient product")
    image=Image.new("RGBA",(1000,1000),(0,0,0,0))
    positions=[]
    for layer in sorted(spec["layers"],key=lambda x:x["z"]):
        original=verified_product_photo(layer["sku"])
        scale=min(layer["height"]/original.height,layer["max_width"]/original.width)
        width=max(1,round(original.width*scale))
        height=max(1,round(original.height*scale))
        photo=original.resize((width,height),Image.Resampling.LANCZOS)
        x=round(layer["x"]-width/2)
        y=round(layer["bottom"]-height)
        if x<20 or y<20 or x+width>980 or y+height>960:
            raise ValueError(f"Ingredient {layer['sku']} touches canvas edge at {x},{y},{width},{height}")
        image.alpha_composite(photo,(x,y))
        positions.append({"sku":layer["sku"],"bbox":[x,y,x+width,y+height]})
    alpha=image.getchannel("A")
    if alpha.getextrema()!=(0,255):
        raise ValueError("Composite is not genuinely transparent")
    if image.getpixel((0,0))[3]!=0 or image.getpixel((999,999))[3]!=0:
        raise ValueError("Composite has opaque corners")
    return image,positions

def qa_preview(batch,index):
    # Compare each flawed supplier group cutout with the new product-only image
    # on the exact same neutral background as the storefront product cards.
    if not batch:return
    card_w,card_h=390,430
    sheet=Image.new("RGB",(card_w*2,card_h*len(batch)), "#ffffff")
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.load_default()
    for i,(sku,slug,new_img) in enumerate(batch):
        previous_path=Path("public")/mapping[slug].get("pre_bundle_image_url",mapping[slug]["image_url"]).lstrip("/")
        if not previous_path.is_file():
            previous_path=trusted_asset(mapping[slug]["source_asset_url"])
        with Image.open(previous_path) as old_src:
            old=old_src.convert("RGBA")
        for col,(asset,label) in enumerate(((old,"PREVIOUS GROUP CUTOUT"),(new_img,"NEW SKU-BASED COMPOSITE"))):
            backdrop=Image.new("RGBA",(card_w,card_h-38), "#f7f6f3")
            asset.thumbnail((card_w-12,card_h-52),Image.Resampling.LANCZOS)
            backdrop.alpha_composite(asset,((card_w-asset.width)//2,(card_h-38-asset.height)//2))
            sheet.paste(backdrop.convert("RGB"),(col*card_w,i*card_h))
            draw.text((col*card_w+11,i*card_h+card_h-28),sku+"  "+label,fill="#302c29",font=font)
    path=Path("photo-qa")/f"bundle-comparison-{index}.jpg"
    path.parent.mkdir(exist_ok=True)
    sheet.save(path,"JPEG",quality=88,optimize=True)
    print("QA_PREVIEW",str(path),flush=True)

if args.check:
    for spec in sets:
        sku=spec["sku"]
        try:
            row=by_sku[sku]
            ref=mapping[row["slug"]]
            if ref.get("bundle_composite_revision")!=REVISION:
                raise ValueError("Missing verified composition revision")
            if ref.get("image_url")!=f"/supplier-photos/bundles/{row['slug']}.webp":
                raise ValueError("Unexpected product photo URL")
            if ref.get("bundle_component_skus")!=[a["sku"] for a in spec["layers"]]:
                raise ValueError("Component list differs from audited manifest")
            file=trusted_asset(ref["image_url"])
            binary=file.read_bytes()
            if ref.get("bundle_composite_sha256")!=hashlib.sha256(binary).hexdigest():
                raise ValueError("Asset SHA-256 mismatch")
            with Image.open(io.BytesIO(binary)) as image:
                if image.size!=(1000,1000) or image.convert("RGBA").getchannel("A").getextrema()!=(0,255):
                    raise ValueError("Asset not a 1000px true-alpha product cutout")
            report["checked"]+=1
        except Exception as error:report["errors"].append({"sku":sku,"error":str(error)})
else:
    for spec in sets:
        try:
            row=by_sku[spec["sku"]]
            new,positions=compose(spec)
            buffer=io.BytesIO()
            new.save(buffer,"WEBP",lossless=True,exact=True,method=5)
            binary=buffer.getvalue()
            staged.append((row,new,binary,positions,[layer["sku"] for layer in spec["layers"]]))
            report["rendered"]+=1
            report["products"].append({"sku":spec["sku"],"components":len(spec["layers"]),"bytes":len(binary),"positions":positions})
            print("COMPOSED",spec["sku"],"components",len(spec["layers"]),"bytes",len(binary),flush=True)
        except Exception as error:
            report["errors"].append({"sku":spec["sku"],"error":str(error)})
            print("COMPOSITE_ERROR",spec["sku"],str(error),flush=True)
    if report["rendered"]==14 and not report["errors"]:
        for start in (0,7):
            batch=[(row["sku"],row["slug"],new.copy()) for row,new,*_ in staged[start:start+7]]
            qa_preview(batch,1+start//7)
        if args.apply:
            OUT.mkdir(parents=True,exist_ok=True)
            for row,photo,binary,positions,component_skus in staged:
                destination=OUT/(row["slug"]+".webp")
                destination.write_bytes(binary)
                ref=mapping[row["slug"]]
                ref.setdefault("pre_bundle_image_url",ref["image_url"])
                ref["image_url"]="/supplier-photos/bundles/"+row["slug"]+".webp"
                ref["bundle_composite_revision"]=REVISION
                ref["bundle_composite_sha256"]=hashlib.sha256(binary).hexdigest()
                ref["bundle_component_skus"]=component_skus
                ref["bundle_method"]="audited_official_single_sku_composition"
            MAP_FILE.write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+"\n")

Path("oliere-bundle-composite-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("SUMMARY",json.dumps({k:v for k,v in report.items() if k!="products"},ensure_ascii=False),flush=True)
if report["errors"] or (not args.check and report["rendered"]!=14) or (args.check and report["checked"]!=14):
    raise SystemExit(1)
