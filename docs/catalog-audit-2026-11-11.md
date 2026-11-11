# RESET Clinic Shop — catalog coverage audit (bundled GitHub snapshot)

Audited source: `data/products.json` on `SviatF/reset-clinic-shop/main`; not a live D1 export.
Do not use these counts to claim the live shop has the complete merchant inventory.

## Currently bundled records
- Total: 165 records; active: 155; drafts: 10
- Histolab: {"total":9,"faceSections":{"cleansing":0,"cream":0,"toning":0,"serums":9,"spf":0},"body":0,"hair":0}
- HydroPeptide: {"total":14,"faceSections":{"cleansing":3,"cream":3,"toning":0,"serums":4,"spf":4},"body":0,"hair":0}
- Dermafirm: {"total":28,"faceSections":{"cleansing":2,"cream":10,"toning":4,"serums":10,"spf":2},"body":0,"hair":0}
- Braderm: {"total":11,"faceSections":{"cleansing":1,"cream":4,"toning":0,"serums":1,"spf":1},"body":3,"hair":1}

## Known limitations
- Histolab bundled source contains only nine serums; it contains **no** Histolab cleansing, face creams, face toner or SPF products. Those cannot be restored without the merchant's authoritative full assortment and prices.
- HydroPeptide bundled source has some cleansing, SPF and cream products, but this is **not** confirmation it contains the complete retail assortment. Current toner count is zero in bundled data.
- Brand-model corrections for 11 Braderm records were checked against the existing supplier Google Sheet (sheet Braderm, 11 product rows). The presentation mapping also corrects older D1 names at render time without changing stock/prices.
- Many descriptions from 2026-10-22 imported catalog were generic or truncated in `short_description`. The product page now uses `description` for the full body and uses a sentence-boundary preview.
- Source price/image provenance for Histolab, HydroPeptide and other web-listed products is provisional. Prices/stock/images must be confirmed by the store owner before any missing product is published.
- For staging D1: authenticated `GET /api/admin/catalog-recovery` shows how many of the bundled products are absent from D1; `POST` can add missing bundled rows **only on staging D1**, without overwriting existing products. Back up D1 before importing.
- Never overwrite the live shop's products/orders with this source snapshot or a zero-order seed. Reconcile records with an authenticated backup.

## Inventory needed before completing the missing range
A full export (SKU/name/brand/category/size/price/stock/description/image) from RESET Clinic's actual shop or an up-to-date supplier inventory is required for the remaining Histolab and HydroPeptide items. Import as drafts first and verify against the merchant's stock/prices.
