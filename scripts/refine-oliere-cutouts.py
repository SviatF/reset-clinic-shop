#!/usr/bin/env python3
"""Refine OLIE'RE product cutouts to remove floors, halo pixels and distant shadows.

Re-segments VERIFIED supplier sources with ISNet (rather than recycling the
old binary U2Net cutout). The new output is versioned separately so v1 and
source photography remain untouched until checks and visual review.

Usage:
  python scripts/refine-oliere-cutouts.py --apply
  python scripts/refine-oliere-cutouts.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
from rembg import new_session, remove
from scipy import ndimage as ndi

ROOT = Path("public/supplier-photos")
MAP_PATH = Path("data/supplier-photo-map.json")
PRODUCTS_PATH = Path("data/products.json")
OUT_DIR = ROOT / "clean"
QA_DIR = Path("photo-qa")
REVISION = "isnet-clean-v2"
SIZE = 1000
MAX_SUBJECT = (820, 835)
THRESHOLD = .74
parser = argparse.ArgumentParser()
parser.add_argument("--apply", action="store_true")
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
assert not (args.apply and args.check)
entries = json.loads(MAP_PATH.read_text())
rows = json.loads(PRODUCTS_PATH.read_text())
items = [p for p in rows if p.get("brand") == "OLIE'RE PARIS" and p.get("status") == "active"]
stats = {"revision": REVISION, "total":len(items), "cleaned":0, "pending_review":[],
         "errors":[], "samples":[]}

def verified_source(entry):
    assert entry["verified_by"] == "exact_official_shopify_product_title_and_size"
    assert entry["source_product_url"].startswith("https://oliere.paris/products/")
    url=entry["source_asset_url"]
    if not url.startswith("/supplier-photos/oliere-exact/"):
        raise ValueError("Source is not a verified official photo")
    source=Path("public") / url.lstrip("/")
    if not source.resolve().is_relative_to(ROOT.resolve()) or not source.is_file():
        raise FileNotFoundError(source)
    return source

def get_model_mask(src, model):
    src=ImageOps.exif_transpose(src).convert("RGB")
    if max(src.size)>1600:
        src.thumbnail((1600,1600),Image.Resampling.LANCZOS)
    soft=remove(src,session=model,only_mask=True,post_process_mask=False)
    if isinstance(soft,bytes): soft=Image.open(io.BytesIO(soft))
    arr=np.asarray(soft.convert("L"),dtype=np.float32)/255
    if arr.shape!=(src.height,src.width):
        raise ValueError("Segmentation changed source dimensions")
    return src,arr

def clean_mask(conf):
    # Aggressive confidence threshold rejects floor shadows, pale halo and
    # soft scenery; package interiors should have high model confidence.
    hard=(conf>=THRESHOLD).astype(np.uint8)
    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3))
    hard=cv2.morphologyEx(hard,cv2.MORPH_OPEN,kernel)
    hard=cv2.morphologyEx(hard,cv2.MORPH_CLOSE,kernel)
    count,labels,components,_=cv2.connectedComponentsWithStats(hard,8)
    if count<=1: raise ValueError("No foreground components found")
    largest=max(int(components[i,cv2.CC_STAT_AREA]) for i in range(1,count))
    if largest<500: raise ValueError("Detected product is too small")
    # Retain all bottles in a kit, but discard small detached shadows/specks.
    minimum=max(110,round(largest*.003))
    accepted=np.zeros_like(hard)
    for i in range(1,count):
        area=int(components[i,cv2.CC_STAT_AREA])
        if area>=minimum: accepted[labels==i]=1
    retained=accepted.sum()
    if retained<500:raise ValueError("Foreground disappeared during cleanup")
    # Shrink 1px to cut original background-colored contour, but preserve
    # narrow details by not eroding them as connected components.
    interior=cv2.erode(accepted,kernel,iterations=1)
    if np.count_nonzero(interior)<retained*.89:
        interior=accepted
    # Antialias *only* the one-pixel object boundary.
    alpha=cv2.GaussianBlur(interior.astype(np.float32),(0,0),.55)
    alpha=np.clip(alpha,0,1)
    alpha[alpha<.02]=0
    alpha[alpha>.995]=1
    return interior, (alpha*255).round().astype(np.uint8), {
        "mask_coverage":round(retained/accepted.size,4),
        "component_count":int(sum(components[i,cv2.CC_STAT_AREA]>=minimum for i in range(1,count))),
        "discarded_area":int(hard.sum()-retained)
    }

def decontaminate_rgb(source, alpha, interior):
    """Use nearest *interior object color* for antialiased pixels; never reuse
    matte-background RGB in the rim, the cause of light/dark outlines."""
    color=np.asarray(source.convert("RGB")).copy()
    # Edge pixels from the original photograph are color-mixed with the backdrop.
    reliable=cv2.erode(interior,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)),iterations=1)>0
    if reliable.sum()<500: reliable=interior>0
    _, coords=ndi.distance_transform_edt(~reliable,return_indices=True)
    dist=ndi.distance_transform_edt(interior>0)
    # Every fractional-alpha edge is filled with the color of the closest
    # reliable foreground pixel at least 3px inside the bottle.
    edge=((alpha>0)&(alpha<255))|((alpha>0)&(dist<2))
    nearest=color[coords[0][edge],coords[1][edge]]
    color[edge]=nearest
    rgba=np.dstack((color,alpha))
    rgba[alpha==0,:3]=0
    return Image.fromarray(rgba,"RGBA")

def build(src,model):
    image,conf=get_model_mask(src,model)
    core,alpha,qa=clean_mask(conf)
    result=decontaminate_rgb(image,alpha,core)
    bbox=result.getchannel("A").point(lambda a:255 if a>=10 else 0).getbbox()
    if not bbox:raise ValueError("Missing product after matte refinement")
    result=result.crop(bbox)
    scale=min(MAX_SUBJECT[0]/result.width,MAX_SUBJECT[1]/result.height)
    final_dims=(max(1,round(result.width*scale)),max(1,round(result.height*scale)))
    result=result.resize(final_dims,Image.Resampling.LANCZOS)
    # Resize RGBA as premultiplied RGB to avoid WebP fringe after Lanczos.
    rgba=np.asarray(result).copy()
    a=rgba[:,:,3]
    rgba[a==0,:3]=0
    result=Image.fromarray(rgba,"RGBA")
    canvas=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0))
    canvas.alpha_composite(result,((SIZE-final_dims[0])//2,(SIZE-final_dims[1])//2))
    final_alpha=np.asarray(canvas.getchannel("A"))
    if final_alpha[0,:].max() or final_alpha[:,0].max() or final_alpha[-1,:].max() or final_alpha[:,-1].max():
        raise ValueError("Cutout touches canvas edge")
    qa["content_dimensions"]=list(final_dims)
    qa["fractional_edge_pixels"]=int(((final_alpha>0)&(final_alpha<250)).sum())
    qa["alpha_max"]=int(final_alpha.max())
    if qa["alpha_max"]<254:raise ValueError("Product opacity lost")
    if qa["component_count"]>6:raise ValueError("Too many disconnected foreground components")
    if qa["mask_coverage"]<.014 or qa["mask_coverage"]>.83:
        raise ValueError("Suspicious foreground coverage")
    return canvas,qa

def report_contact_sheet(pairs):
    """Preview all visual cases on the SAME white card backdrop used by store."""
    QA_DIR.mkdir(exist_ok=True)
    examples=pairs[:12]
    tw,th=330,380
    sheet=Image.new("RGB",(tw*4,th*len(examples)),"#f9f8f5")
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.load_default()
    for row,(sku,source,old,new) in enumerate(examples):
        for col,photo in enumerate((source,old,new)):
            card=Image.new("RGBA",(tw,th-40),"#f7f6f3")
            item=photo.copy()
            item.thumbnail((tw-16,th-58),Image.Resampling.LANCZOS)
            card.alpha_composite(item,((tw-item.width)//2,(th-40-item.height)//2))
            sheet.paste(card.convert("RGB"),(col*tw,row*th))
        draw.text((8,row*th+th-35),sku,fill="#26221e",font=font)
        for j,label in enumerate(("ORIGINAL","PREVIOUS MASK","CLEAN MATTE")):
            draw.text((j*tw+8,row*th+th-18),label,fill="#51483d",font=font)
    sheet.save(QA_DIR/"comparison.jpg",quality=89,optimize=True)

if len(items)!=53:raise ValueError(f"Expected 53 active OLIE'RE SKUs, got {len(items)}")
if args.check:
    for item in items:
        entry=entries[item["slug"]]
        if entry.get("verification_status")=="needs_review":
            stats["pending_review"].append(item["slug"])
            continue
        try:
            if entry.get("isolation_revision")!=REVISION:
                raise ValueError("Expected upgraded clean matte revision")
            target=Path("public")/entry["image_url"].lstrip("/")
            if not target.is_file() or not entry["image_url"].startswith("/supplier-photos/clean/"):
                raise FileNotFoundError(target)
            raw=target.read_bytes()
            if hashlib.sha256(raw).hexdigest()!=entry["isolation_sha256"]:
                raise ValueError("SHA256 mismatch")
            with Image.open(io.BytesIO(raw)) as im:
                a=np.asarray(im.convert("RGBA").getchannel("A"))
                if a.min()!=0 or a.max()!=255:raise ValueError("No real transparency")
                if a[0,:].max() or a[-1,:].max() or a[:,0].max() or a[:,-1].max():
                    raise ValueError("Non-transparent outer edge")
            stats["cleaned"]+=1
        except Exception as error: stats["errors"].append({"sku":item["sku"],"error":str(error)})
else:
    model=new_session("isnet-general-use")
    files=[]
    previews=[]
    for item in items:
        entry=entries.get(item["slug"])
        if entry and entry.get("verification_status")=="needs_review":
            stats["pending_review"].append(item["slug"])
            continue
        try:
            src=verified_source(entry)
            with Image.open(src) as im: photo=im.convert("RGB")
            new,qa=build(photo,model)
            buffer=io.BytesIO()
            new.save(buffer,"WEBP",lossless=True,exact=True,method=5)
            data=buffer.getvalue()
            files.append((item,entry,data,qa))
            stats["cleaned"]+=1
            stats["samples"].append({"sku":item["sku"],"slug":item["slug"],**qa,"bytes":len(data)})
            if len(previews)<12:
                old=Image.open(Path("public")/entry["image_url"].lstrip("/")).convert("RGBA")
                previews.append((item["sku"],photo,old,new))
            print("MATTE",item["sku"],qa,flush=True)
        except Exception as error:
            stats["errors"].append({"sku":item["sku"],"error":str(error)})
            print("FAILED",item["sku"],str(error),flush=True)
    if previews: report_contact_sheet(previews)
    if args.apply and not stats["errors"] and stats["cleaned"]==52 and len(stats["pending_review"])==1:
        OUT_DIR.mkdir(parents=True,exist_ok=True)
        for item,entry,data,qa in files:
            dest=OUT_DIR/(item["slug"]+".webp")
            dest.write_bytes(data)
            entry["pre_refinement_image_url"]=entry.get("image_url")
            entry["image_url"]="/supplier-photos/clean/"+item["slug"]+".webp"
            entry["isolation_revision"]=REVISION
            entry["isolation_sha256"]=hashlib.sha256(data).hexdigest()
            entry["clean_matte_coverage"]=qa["mask_coverage"]
        MAP_PATH.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+"\n")

Path("oliere-clean-matte-report.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2)+"\n")
print("SUMMARY",json.dumps({k:v for k,v in stats.items() if k not in ("samples","errors")},ensure_ascii=False),flush=True)
if stats["errors"] or stats["cleaned"]!=52 or len(stats["pending_review"])!=1:
    print("ERRORS",json.dumps(stats["errors"],ensure_ascii=False)[:6000],flush=True)
    raise SystemExit(1)
