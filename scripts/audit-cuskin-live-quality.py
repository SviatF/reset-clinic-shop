#!/usr/bin/env python3
"""Read-only audit of live CU SKIN catalog image resolutions and alpha. No D1/R2 writes."""
import concurrent.futures
from html.parser import HTMLParser
from io import BytesIO
import json
from PIL import Image, ImageFilter, ImageStat
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = "https://shop.resetclinic.org"
def download(url):
    with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=20) as r:
        return r.read(7_000_000)

class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items=[]
    def handle_starttag(self,tag,attrs):
        if tag!="img":
            return
        attrs=dict(attrs)
        src,alt=attrs.get("src",""),attrs.get("alt","")
        if "/api/media/products/" in src and alt.lower().startswith("cu skin"):
            self.items.append({"src":src,"alt":alt})

items=[]
for page in range(1,5):
    page_url=f"{ROOT}/catalog?brand=CU+SKIN&page={page}"
    parser=Images()
    parser.feed(download(page_url).decode("utf-8",errors="replace"))
    for item in parser.items:
        item["page"]=page
        items.append(item)

def examine(item):
    try:
        data=download(urljoin(ROOT,item["src"]))
        image=Image.open(BytesIO(data))
        image.load()
        rgba=image.convert("RGBA")
        corner=rgba.getpixel((0,0))
        edges=rgba.convert("RGB").filter(ImageFilter.FIND_EDGES).convert("L")
        stat=ImageStat.Stat(edges)
        return {"page":item["page"],"name":item["alt"],"path":item["src"],
                "dimensions":list(image.size),"format":image.format,"bytes":len(data),
                "alpha_corner":corner[3], "alpha_extrema":list(rgba.getchannel("A").getextrema()),
                "edge_variance":round(stat.var[0],2)}
    except Exception as e:
        return {"page":item["page"],"name":item["alt"],"path":item["src"],"error":str(e)[:130]}

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    rows=list(pool.map(examine,items))
legacy=[x for x in rows if "/2026-11-16/" in x["path"]]
small=[x for x in rows if "dimensions" in x and min(x["dimensions"])<400]
opaque=[x for x in rows if "alpha_corner" in x and x["alpha_corner"]>0]
failed=[x for x in rows if "error" in x]
print("CU_LIVE_QUALITY_SUMMARY",json.dumps({"total":len(rows),"legacy_files":len(legacy),"under_400":len(small),
      "opaque_corners":len(opaque),"errors":len(failed)},ensure_ascii=False))
for row in legacy+small+failed:
    print("CU_LIVE_PHOTO_ISSUE",json.dumps(row,ensure_ascii=False))
for row in opaque:
    print("CU_LIVE_OPAQUE",json.dumps(row,ensure_ascii=False))

# Final visual background audit after the official PNG priority upgrade.
