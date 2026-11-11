# Import of public supplier listings — 2026-11-11

Source repository: SviatF/reset-clinic-shop, branch main. This is a **non-destructive draft-only GitHub catalog import**, not a live D1 import or merchant-approved inventory.

## Scope
- Added 114 candidate draft products to `data/products.json` (165 pre-existing records remain unchanged).
- Total bundled catalog after import: 279 records.
- Additional drafts by brand: Histolab 24; HydroPeptide 9; Cetaphil 1; Sensilis 37; DÉCAAR 24; CU SKIN 19.
- Each new record has `status=draft`, `track_stock=true`, `stock_quantity=0`, `published_at=null`.
- Products with an unverified or undisplayed price use `price=0`. The prices provided by source sites are observations, **not approved retail prices**.
- Each source candidate, provenance URL and price observation are in `data/supplier-import-2026-11-11.json`.
- No source product images or assets have been copied. Merchant must verify image rights, pricing, volume, claims and stock before publishing.
- CU SKIN product names were identified from a public search index because the live cu.ua homepage did not return readable catalog content in the browsing environment; treat as especially provisional.
- This import is **partial**: six suppliers may have more products than those confirmed from browsable public listings. Do not claim a complete supplier feed or complete merchant assortment.

## Publishing to D1
The updated repository snapshot alone does **not** modify the Cloudflare D1 database.
Before any import to D1, use authenticated `/api/admin/catalog-export` or `/api/admin/storage-export` to create an offline/private backup; never commit backups that contain customer records.
On a configured **staging** Worker only (`SHOP_STAGING=true`, `SHOP_STORAGE_BACKEND=cloudflare`, `SHOP_PRODUCTS_BACKEND=d1`), the existing authenticated `/api/admin/catalog-recovery` endpoint reports missing source products.
The existing admin button “Перенести відсутні товари до D1” performs an explicit append-only import, matching by slug and id; it should not overwrite existing edits/orders.
Review every new draft in admin, add photos to R2, correct sizes/prices and stock, and individually publish approved SKUs.

## Source sites
- https://histolab.com.ua/
- https://hydropeptide.ua/shop/
- https://avepharm.com.ua/magazyn/brands/cetaphil/ (Cetaphil only)
- https://sensilis.com.ua/katalog/
- https://decaar.com.ua/domashnij-dogljad/
- https://cu.ua/
