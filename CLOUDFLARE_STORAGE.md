# Cloudflare shop — simplified storage

No migration of existing products or GitHub images. New admin credentials will be configured as Worker secrets.

## Storage
- `data/products.json`: GitHub repository API, with GITHUB_TOKEN (read and write).
- `public/**`: published from GitHub source at build time.
- `data/orders.json`, `data/activity.json`: new Cloudflare D1 database SHOP_DB when SHOP_STORAGE_BACKEND=cloudflare. Existing Cityhost orders are NOT imported under current scope.
- Admin photo uploads remain GitHub-backed, require GITHUB_TOKEN with contents write, and become available only after rebuild/redeploy. No R2 bucket.
- The Worker must have `SHOP_DB` D1 binding and migration applied before switching on Cloudflare mode.
- Worker secrets: `MONOPAY_TOKEN`, `ADMIN_LOGIN`, `ADMIN_PASS`, `GITHUB_TOKEN`; variable `SITE_URL=https://shop.resetclinic.org`; `SHOP_STORAGE_BACKEND=cloudflare`.
- **Do not reuse Cityhost admin credentials**. Do not commit any secrets.

## Prelaunch checks
Confirm all existing image URLs are served (including any Cityhost `/shop-media/` uploads — not present in GitHub by default), product list, admin login, product edit, stock decrement, checkout, order persistence, Mono invoices/webhooks and webhook redirects. New D1 initially starts with no orders.

Production Cityhost, DNS, and the main RESET Worker must remain unchanged until tested. This branch is not a completed production migration.
