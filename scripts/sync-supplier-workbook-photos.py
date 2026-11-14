#!/usr/bin/env python3
"""Attach photos from the supplier workbook to existing products by exact source row/SKU."""
import io
import json
import os
import sys
import zipfile
import hashlib
from pathlib import Path
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
from PIL import Image, ImageOps

BOOK = 'https://docs.google.com/spreadsheets/d/1xx3Tmx_7y2yMrSUrizUJOw9WSIhImHk86s2Mv8NfVmc/export?format=xlsx'
NS = {
 'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
APPLY = '--apply' in sys.argv
products = json.loads(Path('data/products.json').read_text())
path = Path('data/supplier-photo-map.json')
records = json.loads(path.read_text())
by_sku = {p['sku']:p for p in products if p.get('sku')}
if os.environ.get('SOURCE_WORKBOOK'):
    raw = Path(os.environ['SOURCE_WORKBOOK']).read_bytes()
else:
    print('Fetching original supplier workbook (public export)')
    with urlopen(Request(BOOK, headers={'User-Agent':'Mozilla/5.0'}), timeout=45) as response:
        raw = response.read(80_000_001)
if len(raw)>80_000_000 or not raw.startswith(b'PK'):
    raise RuntimeError('Supplier workbook is not a valid XLSX download')
result = []
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    for sheet_number, brand in [(1, 'Dermafirm'), (2, 'Braderm')]:
        relpath=f'xl/drawings/_rels/drawing{sheet_number}.xml.rels'
        drawingpath=f'xl/drawings/drawing{sheet_number}.xml'
        drawing=ET.fromstring(archive.read(drawingpath))
        rels=ET.fromstring(archive.read(relpath))
        target_by_id={a.attrib['Id']:a.attrib['Target'] for a in rels}
        count = 0
        for anchor in drawing:
            from_cell=anchor.find('xdr:from',NS)
            if from_cell is None: continue
            row=from_cell.find('xdr:row',NS)
            blip=anchor.find('.//a:blip',NS)
            if row is None or blip is None: continue
            row_no=int(row.text)+1
            rid=blip.get('{'+NS['r']+'}embed')
            if not rid or rid not in target_by_id: continue
            target=target_by_id[rid]
            filename='xl/'+target.removeprefix('../')
            if filename not in archive.namelist():
                raise RuntimeError('Missing embedded photo '+filename)
            sku=f'{brand.upper()}-{row_no:03d}'
            record=by_sku.get(sku)
            if not record or record['id'] != f'sheet_{brand.lower()}_{row_no:03d}':
                raise RuntimeError('Supplier row does not match verified product SKU: '+sku)
            original=archive.read(filename)
            picture=Image.open(io.BytesIO(original))
            picture=ImageOps.exif_transpose(picture)
            picture.thumbnail((1200,1200),Image.Resampling.LANCZOS)
            picture=picture.convert('RGB')
            output=io.BytesIO()
            picture.save(output,format='WEBP',quality=85,method=5)
            image_bytes=output.getvalue()
            dest=Path('public/supplier-photos')/brand.lower()/(record['slug']+'.webp')
            if APPLY:
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(image_bytes)
            records[record['slug']]={
                'image_url':'/'+dest.as_posix().removeprefix('public/'),
                'source_sheet_url':BOOK.split('/export?')[0]+'/edit',
                'source_sheet':brand,
                'source_sheet_row':row_no,
                'match_score':1.0,
                'sha256':hashlib.sha256(image_bytes).hexdigest(),
            }
            result.append({'sku':sku,'slug':record['slug'],'bytes':len(image_bytes)})
            count+=1
        print(brand,':',count,'embedded images')
        if count!={'Dermafirm':28,'Braderm':11}[brand]:
            raise RuntimeError(f'Unexpected {brand} image count {count}')
if len(result)!=39:raise RuntimeError(f'Expected 39 matched images, got {len(result)}')
if APPLY:path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('Matched',len(result),'images; optimized bytes',sum(i['bytes'] for i in result),'applied',APPLY)
