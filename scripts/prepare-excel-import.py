#!/usr/bin/env python3
"""Prepare product drafts and original embedded photos from the supplier workbook.
Usage: python scripts/prepare-excel-import.py supplier.xlsx ./dermafirm-braderm-import
Writes products.json and images/*.png|jpg; never changes GitHub or the website.
Uses only Python's standard library (no openpyxl).
"""
import json
import pathlib
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
XDR = "{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
R = "{http://schemas.openxmlformats.org/package/2006/relationships}"

def slugify(value):
    return re.sub(r"(^-+|-+$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))

def cell_text(cell, shared):
    value = cell.find(S + "v")
    if value is not None:
        raw = value.text or ""
        return shared[int(raw)] if cell.get("t") == "s" else raw
    inline = cell.find(S + "is")
    return "".join(inline.itertext()) if inline is not None else ""

def read_rows(z, sheet_no, shared):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{sheet_no}.xml"))
    records = []
    for row in root.findall(".//" + S + "sheetData/" + S + "row"):
        cols = {}
        for cell in row.findall(S + "c"):
            match = re.match(r"[A-Z]+", cell.get("r", ""))
            if match:
                cols[match.group()] = cell_text(cell, shared).strip()
        records.append((int(row.get("r")), cols))
    return records

def photo_anchors(z, sheet_no):
    drawing = ET.fromstring(z.read(f"xl/drawings/drawing{sheet_no}.xml"))
    links = ET.fromstring(z.read(f"xl/drawings/_rels/drawing{sheet_no}.xml.rels"))
    targets = {item.get("Id"):item.get("Target") for item in links}
    result = {}
    for anchor in drawing:
        cell = anchor.find(XDR + "from")
        if cell is None:
            continue
        row = cell.find(XDR + "row")
        blip = anchor.find(".//" + A + "blip")
        if row is None or blip is None:
            continue
        target = targets.get(blip.get(REL + "embed"))
        if not target:
            continue
        normalized = posixpath.normpath(posixpath.join("xl/drawings", target))
        result[int(row.text) + 1] = normalized
    return result

def category_and_sub(name, brand):
    n = name.lower()
    if re.search(r"шампун|shampoo|scalp|волосс", n):
        category = "hair"
        sub = "shampoo" if re.search(r"шампун|shampoo", n) else ""
    elif re.search(r"для тіла|body", n):
        category, sub = "body", ""
    else:
        category, sub = "face", ""
    if not sub:
        if re.search(r"spf|сонцезахис|sun.?cream|sunscreen|uv.derm", n):
            sub = "spf"
        elif re.search(r"пінка|вмиван|очищ|cleanser|cleansing|mousse|wash", n):
            sub = "cleansing"
        elif category == "face" and re.search(r"тонік|тонер|toner|tonic", n):
            sub = "toning"
        elif category == "face" and re.search(r"сироват|серум|serum|ampoule|ампул", n):
            sub = "serums"
        elif re.search(r"крем|cream|лосьйон|lotion", n):
            sub = "cream"
    return category, ([sub] if sub else [])

def price_number(value):
    text = re.sub(r"[^0-9,.]", "", value.replace(" ", ""))
    return float(text.replace(",", ".")) if text else None

def product_line(brand, english):
    if brand != "Dermafirm":
        return ""
    for line in ("Peptology", "UV-Derm", "Age Reviving A4", "The Peptide P4", "Moist Barrier M4", "Soothing Repair R4", "CICAA-C"):
        if line.lower() in english.lower():
            return line
    return "Special Care"

def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: python scripts/prepare-excel-import.py supplier.xlsx output-directory")
    source = pathlib.Path(sys.argv[1])
    output = pathlib.Path(sys.argv[2])
    media_dir = output / "images"
    media_dir.mkdir(parents=True, exist_ok=True)
    products, warnings, slugs = [], [], set()
    with zipfile.ZipFile(source) as z:
        strings_xml = ET.fromstring(z.read("xl/sharedStrings.xml"))
        shared = ["".join(node.itertext()) for node in strings_xml.findall(S + "si")]
        for sheet_no,brand in [(1, "Dermafirm"),(2, "Braderm")]:
            pictures = photo_anchors(z, sheet_no)
            for row_index, cells in read_rows(z, sheet_no, shared):
                title = cells.get("A", "")
                international = cells.get("B", "")
                price = price_number(cells.get("F", ""))
                if not title or not international or price is None:
                    continue
                slug = slugify(brand + " " + international)
                if not slug:
                    warnings.append(f"{brand} row {row_index}: missing Latin slug")
                    continue
                if slug in slugs:
                    warnings.append(f"{brand} row {row_index}: duplicate base slug {slug}; requires manual review")
                    slug = f"{slug}-{row_index}"
                slugs.add(slug)
                photo = pictures.get(row_index)
                image_file = None
                if photo and photo in z.namelist():
                    image_file = "images/" + slug + pathlib.Path(photo).suffix.lower()
                    (output / image_file).write_bytes(z.read(photo))
                else:
                    warnings.append(f"{brand} row {row_index}: image missing")
                category,subs = category_and_sub(title + " " + international,brand)
                raw_description = cells.get("D","")
                if len(raw_description) > 5000:
                    warnings.append(f"{brand} row {row_index}: long description; review 5000-character API limit")
                products.append({
                    "slug":slug,"name":title,"international_name":international,"brand":brand,
                    "product_line":product_line(brand,international),"category":category,
                    "subcategory_slugs":subs,"status":"draft",
                    "short_description":re.split(r"\n\s*\n",raw_description,1)[0][:500],
                    "description":raw_description[:5000],
                    "price":price,"currency":"UAH","stock_quantity":0,"track_stock":True,
                    "size":cells.get("E","").strip(),"image_file":image_file,
                    "sku":None,
                })
    (output / "products.json").write_text(json.dumps({"products":products,"warnings":warnings},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Prepared {len(products)} draft products in {output}; pictures in {media_dir}")
    print(f"Warnings: {len(warnings)}. No prices, inventory or product claims have been approved for publishing.")
    if len(products) != 39:
        raise SystemExit("Expected 39 products: investigate skipped/malformed workbook rows before import")

if __name__ == "__main__":
    main()
