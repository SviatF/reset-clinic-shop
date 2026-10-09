# Cloudflare shop storage cutover

The Cloudflare adapter uses D1 `SHOP_DB` and R2 `SHOP_MEDIA` when `SHOP_STORAGE_BACKEND=cloudflare`.

1. Provision a D1 database and an R2 bucket in the same Cloudflare account.
2. Add `d1_databases` binding named `SHOP_DB` with its **real** database_id and `r2_buckets` binding named `SHOP_MEDIA` with its actual bucket_name to `wrangler.jsonc`. Do not fabricate IDs.
3. Apply `migrations/0001_shop_documents.sql` with `wrangler d1 execute <database> --remote --file migrations/0001_shop_documents.sql`.
4. Export the active Cityhost `SHOP_DATA_DIR` first. Migrate `products.json`, `orders.json`, `activity.json` into `shop_documents` using paths `data/products.json`, `data/orders.json`, `data/activity.json`; transfer `uploads/**` to R2 using the same keys.
5. **Critical:** all existing product image URLs that use `/shop-media/...` must have matching R2 objects; check absolute URLs and `/uploads/` links separately.
6. Only after successful import, set Worker variable `SHOP_STORAGE_BACKEND=cloudflare` and secure runtime secrets `MONOPAY_TOKEN`, `ADMIN_LOGIN`, `ADMIN_PASS`, `SITE_URL=https://shop.resetclinic.org`.
7. Test checkout, order storage, admin editing, images, webhook signature validation and actual Monobank payment flows on staging before changing DNS.
8. During cutover pause writes briefly or sync any Cityhost orders created after the initial export. Confirm counts and restore plan.

**This commit does not create Cloudflare resources, import live Cityhost data, deploy or change DNS.**
