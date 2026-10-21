# Excel importer — staging only
1. Run `python scripts/prepare-excel-import.py supplier.xlsx ./prepared`.
2. Inspect `prepared/products.json`: 39 draft products, manufacturer name anomalies, prices, categories. Photos extracted to `prepared/images`.
3. Authenticate to the isolated staging admin and POST JSON content to `/api/admin/products/import` for preview. Include `{"products":[...],"preview":false}` to commit draft products. Existing slugs are skipped, not overwritten.
4. Upload each extracted image through the current admin uploader (backed by R2 after binding `SHOP_MEDIA`) and link it to the draft. Do NOT publish while image, SKU, claims, prices, or stock are unverified.
5. The API intentionally creates only unpublished drafts with 0 stock. Prices in supplier workbook are not assumed current, and no manufacturer SKU is invented.
6. Preserve the original Excel and an export of the existing catalogue for rollback.
