# RESET Clinic Shop — Cityhost → Cloudflare Workers

Target hostname: `shop.resetclinic.org`. The main `resetclinic.org` Worker remains independent.

## Deployment preparation

1. Install the platform packages (this repository currently has no lockfile):
   `npm install @opennextjs/cloudflare && npm install -D wrangler`
2. Add the following scripts to package.json after verifying compatible package versions:
   - `cf:build`: `opennextjs-cloudflare build`
   - `cf:preview`: `opennextjs-cloudflare build && opennextjs-cloudflare preview`
   - `cf:deploy`: `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
3. Check locally: `npm run build`, `npm run cf:build`, `npm run cf:preview`.
4. Configure Worker runtime secrets `MONOPAY_TOKEN`, `ADMIN_LOGIN`, `ADMIN_PASS`, `SITE_URL=https://shop.resetclinic.org`.
5. **Do not set SHOP_DATA_DIR** in Workers; `node:fs` is not persistent there.
6. Before any production traffic, migrate the active Cityhost storage for products, orders, activity and uploaded photos to durable storage (recommended D1 + R2). Current GitHub JSON fallback requires GITHUB_TOKEN, commits mutable customer data to the repository, and is **not** a safe substitute for migration.
7. Check live commerce flows, order persistence, admin edits, stock updates, uploads, Monobank invoice creation, webhook signatures and payment redirects. Confirm existing Cityhost data was transferred without losing orders.
8. Only after validation, attach custom domain `shop.resetclinic.org` to this Worker in the Cloudflare dashboard, remove conflicting DNS routing and update Monobank webhook settings. Keep Cityhost available for rollback until verified.

## Restrictions

The legacy `server.js` is Cityhost-specific and does not run as the Workers entry point. The Cloudflare entry point is the OpenNext-generated `.open-next/worker.js`.

This branch contains **only staging configuration**, not a completed production migration. Do not publish the shop to production until durable data storage and payments are validated.
