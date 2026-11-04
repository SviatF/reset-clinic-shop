# RESET Clinic Shop — migration to Cloudflare D1 + R2

This is a **two-phase, non-destructive cutover**. Do not enable D1 until every source document is backed up and its hash matches the new D1 copy. Do not disable SHOP_STAGING to test the migration.

## Where the data goes

- Cloudflare D1 binding **SHOP_DB**: products, categories, brands, orders (including customer contact/delivery details), and audit activity. Current schema is a versioned document store in shop_documents; no application rewrite required.
- Cloudflare R2 binding **SHOP_MEDIA**: new product photos uploaded through the admin UI; URLs retain /shop-media/products/... and require **no redeploy**.
- Static editorial photos imported from assets/img remain bundled with Next.js.
- 53 product image references currently point to external Shopify CDN URLs. They stay unchanged until the owner confirms they can be migrated. They must not be silently copied.
- Repository data/*.json stays as a **read-only backup/seed**, not the writable production database.

## Step 0 — secure source backup (REQUIRED)

During a maintenance window, pause editing products and accepting new orders so the export is consistent. While authenticated as administrator, download:

    https://shop.resetclinic.org/api/admin/storage-export

The resulting file contains **personal data from orders**. Store it only locally, under migration-backups/, encrypted if possible. Do not paste it into ChatGPT or commit it to GitHub. The endpoint refuses an export based only on a bundled staging fallback, which can falsely show zero orders.

Do not rely on data/products.json as the source if production admins have made edits or orders have been received. A pre-migration snapshot MUST contain all five arrays: products, categories, brands, orders and activity.

## Step 1 — create Cloudflare resources

Run these commands from the project directory using a Cloudflare account with access to this Worker:

    npx wrangler login
    npx wrangler d1 create reset-clinic-shop-db --location eeur
    npx wrangler r2 bucket create reset-clinic-shop-media

If a resource already exists, **do not create a duplicate**. Inspect it with npx wrangler d1 list and npx wrangler r2 bucket list. Copy the actual D1 database UUID returned by Cloudflare; it is a resource identifier, not a secret.

## Step 2 — add bindings WITHOUT switching the application

    node scripts/configure-shop-cloudflare.mjs --database-id REAL-D1-UUID --database-name reset-clinic-shop-db --bucket reset-clinic-shop-media

This adds d1_databases SHOP_DB and r2_buckets SHOP_MEDIA to wrangler.jsonc while leaving SHOP_STORAGE_BACKEND, SHOP_PRODUCTS_BACKEND and SHOP_MEDIA_BACKEND unset. It also keeps SHOP_STAGING unchanged. Commit and deploy these **bindings-only** changes first, without enabling D1.

A D1 binding requires a real database_id (not a placeholder). R2 requires a real bucket_name.

## Step 3 — initialize D1 schema

    npx wrangler d1 migrations apply reset-clinic-shop-db --remote

The initial migration migrations/0001_shop_documents.sql creates the versioned document table. Before importing, check the destination is empty or knowingly prepared:

    npx wrangler d1 execute reset-clinic-shop-db --remote --command "SELECT pathname FROM shop_documents;"

If existing production documents are present, STOP: do not overwrite them. Determine the canonical source of truth and reconcile changes first.

## Step 4 — import all five document types safely

    node scripts/prepare-shop-d1.mjs migration-backups/reset-clinic-private-storage-backup.json migration-backups/shop-d1-import.sql
    npx wrangler d1 execute reset-clinic-shop-db --remote --file=migration-backups/shop-d1-import.sql

This generates an import script that splits JSON into SQL statements below D1's 100 KB statement limit. D1 allows up to 2 MB per string/row; the generator stops if a source document exceeds a conservative 1.9 MB threshold. Import uses INSERT OR IGNORE for destination documents: **existing D1 documents are never replaced**. Repeated imports are safe but require explicit checksum verification afterward.

The private checksum manifest is written as:

    migration-backups/shop-d1-import.manifest.json

## Step 5 — verify records AND full SHA-256 checksums

After deploying the bindings-only config, open this authenticated admin URL and save its JSON to migration-backups/storage-verify.json:

    https://shop.resetclinic.org/api/admin/storage-verify

Then run:

    node scripts/verify-shop-d1.mjs migration-backups/shop-d1-import.manifest.json migration-backups/storage-verify.json

Cutover is **blocked** unless all five documents have the same record counts and SHA-256 content hashes as the source, and the R2 binding exists. This protects against missing orders, partial imports and older/stale product data.

## Step 6 — activate D1 + R2 together

Only after successful verification, freeze writes again and ensure no orders were created or edited since the source backup. If changes occurred, export again and reconcile the new records before cutover.

    node scripts/configure-shop-cloudflare.mjs --database-id REAL-D1-UUID --database-name reset-clinic-shop-db --bucket reset-clinic-shop-media --activate --confirmed-migrated

Commit the changed wrangler.jsonc and deploy. The flags will be:

    SHOP_STORAGE_BACKEND=cloudflare
    SHOP_PRODUCTS_BACKEND=d1
    SHOP_MEDIA_BACKEND=r2

Keep SHOP_STAGING=true until the payment processor and invoice/stock logic are separately validated. Do **not** make real test payments without explicit approval.

## Step 7 — validate in application

- GET /api/health should show storage=d1, writable=true, media=r2 and correct catalog counts.
- In the admin panel, create a draft product, upload a photo, confirm the URL is /shop-media/products/... and can be read.
- Update the draft product price and ensure it appears on the site immediately without a GitHub commit or rebuild.
- Verify read/write and navigation from both desktop and mobile.
- Confirm D1 order and activity documents are present, not reset to [].
- Check the authenticated verification endpoint again and retain the original source backup until production validation is complete.

## Rollback safety

Changing backend flags back to GitHub restores the old source but **does not transfer later D1 writes back to GitHub**. If orders or admin edits occur after cutover, export the D1 state first and reconcile it before rolling back; otherwise those changes will appear lost. Do not delete D1/R2 resources or the backup.

## Security and configuration

- Do not commit Cloudflare API tokens, login credentials, order exports or the SQL import containing customer details. migration-backups/ is in .gitignore.
- SHOP_DB and SHOP_MEDIA are binding identifiers; GitHub credential variables are not required once D1/R2 is activated.
- Deleting a required D1 document causes an error rather than replacing it with an empty list.
- R2 upload fails safely if the configured bucket is missing, instead of accidentally writing photo files back to GitHub.

Official references:
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/r2/reference/wrangler-commands/
- https://developers.cloudflare.com/workers/wrangler/configuration/
