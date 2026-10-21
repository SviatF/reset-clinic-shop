# RESET Clinic Shop — isolated catalog development (main-SASHA)

## Branch discipline and rollback
- **Production branch is `main`**. Do not commit, merge or deploy the work in this document to `main`.
- Feature branch: `main-SASHA`.
- Exact original repository snapshot: `b2d5aeab5b4a4a9ecd2b84ea3b2b82cdfdd96668`.
- Immutable-intent backup branch: `backup/pre-catalog-restructure-2026-10-21`.
- Rolling code back means deploying the previous commit/branch; this does NOT automatically roll back orders, D1 records or R2 assets. Back up data separately.

## Existing data sources
- Old repo-based product data: `data/products.json` plus three `data/hair-products-*.json` files.
- Product reads now converge on `readProducts()` for catalog, admin, checkout and sitemap. Legacy hair seeds are merged if not yet imported.
- Current storage is unchanged by default. No production Cloudflare bindings have been modified.

## New catalogue structure
- Parent categories: hair, face, body (existing routes preserved).
- Subcategories (editable in `/admin/categories`) are stored at `data/categories.json` or D1 when opted in.
- Visible pages: `/hair/shampoo`, `/hair/conditioner`, `/hair/mask`, `/hair/styling`; `/face/cream`, `/face/cleansing`, `/face/toning`, `/face/serums`, `/face/spf`; `/body/cleansing`, `/body/cream`, `/body/spf`.
- Products with no explicit subcategory assignment fall back to name-based classification. Review this inferred mapping before public release.

## Safe D1 cutover — staging only
1. Deploy this branch to an isolated staging Worker and staging domain. Do not bind the production domain.
2. Check `SHOP_DB` (D1) binding and apply the existing `migrations/0001_shop_documents.sql` in the STAGING database.
3. On the source environment, authenticate as admin and download `GET /api/admin/catalog-export`. Keep the JSON as a separately backed-up file. Verify product count, brands and images. An export may include records from an older local store.
4. Generate SQL: `node scripts/prepare-catalog-d1.mjs ./reset-catalog-backup.json ./catalog-import.sql`.
5. Apply generated SQL to staging D1 using `wrangler d1 execute <STAGING_DATABASE_NAME> --remote --file=./catalog-import.sql`.
6. Only then set `SHOP_STORAGE_BACKEND=cloudflare` and `SHOP_PRODUCTS_BACKEND=d1` in the staging Worker.
7. Compare original and staging catalog counts, product IDs, slugs, prices, stock and URLs. Test a draft edit, an order and a valid monobank sandbox/test payment path.
8. Do not turn on the new backend for production until signed off and a fresh production data backup exists.

## R2 images — optional
- Existing images are left in their original locations.
- New upload path supports R2 when a bucket is bound as `SHOP_MEDIA` to the Worker. Example Wrangler binding: `"r2_buckets":[{"binding":"SHOP_MEDIA","bucket_name":"<REAL-STAGING-BUCKET>"}]`. Use real provisioned bucket names only.
- Without an R2 binding, the previous local/GitHub upload path remains and GitHub uploads still require a rebuild.
- Back up R2 objects independently before decommissioning any source file store.

## Not completed / deployment blockers
- Production D1/R2 resources have NOT been provisioned or migrated.
- Bulk Excel import and the 39 Dermafirm/Braderm images have NOT been published yet. They require data normalization, original embedded-image extraction and stock/price verification.
- No end-to-end build, runtime, image-upload, monobank or deployment test has yet been run.
- Never assume a build or successful migration solely because code was committed.
