# GTM / GA4 ecommerce — RESET Clinic Shop

## Installed globally
- Google Tag Manager container: GTM-58GQ89JW in the Next.js root layout, on all pages.
- Uses the standard GTM loader and noscript iframe; no duplicate standalone gtag.js loader.

## Events pushed to dataLayer
- begin_checkout: once per checkout mount with cart items.
- add_payment_info: on order submission; NOT a completed purchase.
- purchase: only on the return page once the SERVER confirms a signed Monobank webhook has been stored successfully.
- Clears stale ecommerce object before each event.
- purchase ecommerce payload: transaction_id, value (UAH, not kopecks), currency, items with item_id, item_name, price, quantity.
- The amount is taken from the saved order and the bank finalAmount when available.

## Attribution captured and saved on orders in D1
UTM parameters: utm_source, utm_medium, utm_campaign, utm_content, utm_term.
Click IDs: gclid, fbclid, gbraid, wbraid.
GA4 client_id is parsed from the _ga cookie. GA4 session_id is parsed from the session cookie _ga_* when there is exactly one unambiguous GA4 stream or the measurement ID is configured.
The optional public NEXT_PUBLIC_GA4_MEASUREMENT_ID can be supplied at frontend BUILD time. Otherwise GA4 IDs can be missing. Cookie consent/blockers can make them unavailable; no synthetic IDs are generated.
Attribution values and optional GA4 IDs are stored as order.attribution in Cloudflare D1 for possible future server-side Measurement Protocol dispatch.
This implementation deliberately does NOT send an additional server-side purchase to prevent double counting.

## Configure GTM (important)
The GTM container alone does not automatically send GA4 purchases.
1. In GTM container GTM-58GQ89JW, configure GA4 Google tag (correct G-... measurement ID) for all pages.
2. Create a GA4 Event tag with Custom Event trigger EXACTLY "purchase".
3. Enable Ecommerce from the Data Layer, or map ecommerce.transaction_id, ecommerce.value, ecommerce.currency, ecommerce.items.
4. Optionally configure begin_checkout and add_payment_info custom-event tags.
5. Do not add additional purchase triggers on payment button clicks or result page views.
6. Verify in GTM Preview, GA4 DebugView and publish the container.

## Confirmed payment and deduplication
- Monobank webhook signatures are verified with x-sign before recording payment success.
- Bank amount must match original server-created invoice amount (integer kopecks).
- Out-of-order processing notifications cannot downgrade already successful orders.
- Only a persisted successful order can make GET /api/analytics/purchase?invoiceId=...&reference=... return ready:true.
- Both invoice ID and unguessable order reference are required; data never come from a browser cart.
- transaction_id is stable order_number (RST-...). Browser localStorage stores a one-time purchase flag keyed to that ID. GA4 also uses transaction_id for duplicate purchase handling.
- Cash-at-pickup orders store GA4 attribution, but are NOT counted as paid on order creation. Staff must mark cash received; optional future server-side dispatch should use a durable idempotent queue.

## Safe testing
Open landing page with example UTM/click IDs, navigate to checkout, verify order draft tracking and dataLayer begin_checkout/add_payment_info; no purchase.
Use a controlled verified paid Monobank transaction to confirm the signed webhook, D1 paid status and a single dataLayer purchase with correct amount/items. Reload the return page to ensure no repeat.
A real payment/webhook test was NOT performed during development.
