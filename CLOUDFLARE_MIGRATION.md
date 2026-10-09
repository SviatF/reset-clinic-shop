# RESET Clinic Shop — Cloudflare Workers deployment

Target: `shop.resetclinic.org` (separate Worker from main `resetclinic.org`).

## Scope
- Keep product records and all images already committed in GitHub. No product import.
- New `ADMIN_LOGIN` and `ADMIN_PASS` stored as Cloudflare Worker secrets.
- Existing Cityhost order records are not imported. New Worker orders/activity persist in D1 `SHOP_DB`.
- GitHub product editing/upload requires a scoped GitHub token (contents write), and newly uploaded media must be deployed.
- Image URLs that point at Cityhost-only `/shop-media/` storage need manual assessment.

## Steps
1. `npm install` (generate and commit lockfile). Validate OpenNext compatibility and successful `npm run build` / `npm run cf:build`.
2. Create Cloudflare D1 DB; bind `SHOP_DB` using its actual database_id in wrangler.jsonc.
3. Apply `migrations/0001_shop_documents.sql` to that database.
4. Set `SHOP_STORAGE_BACKEND=cloudflare` and `SITE_URL=https://shop.resetclinic.org`. Set secrets `ADMIN_LOGIN`, `ADMIN_PASS`, `GITHUB_TOKEN`, `MONOPAY_TOKEN` via Cloudflare securely.
5. Deploy to a staging Workers URL. Verify pages, assets, admin sign-in, catalog updates, test orders, payment callbacks, stock decrement, GitHub-backed upload/redeployment.
6. Confirm domain routing/DNS for `shop.resetclinic.org` is within the Cloudflare zone before binding. Do not change main website Worker.
7. Cut over the shop hostname only after verification; keep Cityhost rollback path.

No live DNS/deployment/secret changes have been made.
