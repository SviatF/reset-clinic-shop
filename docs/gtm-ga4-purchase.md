# GTM / GA4 ecommerce — RESET Clinic Shop

## Installed globally
- Google Tag Manager container: GTM-58GQ89JW in the Next.js root layout, on all pages.
- Uses the standard GTM loader and noscript iframe; no duplicate standalone gtag.js loader.

## Events pushed to dataLayer
- view_item: on product detail views, including unavailable products.
- add_to_cart: when a product is added or quantity increases (actual quantity delta).
- remove_from_cart: when a product is removed or quantity decreases (actual quantity delta).
- view_cart: when cart drawer opens or the /cart page loads with items.
- add_shipping_info: on checkout submission, including shipping_tier; NOT a purchase.
- begin_checkout: once per checkout mount with cart items.
- add_payment_info: on order submission; NOT a completed purchase.
- purchase: only on the return page once the SERVER confirms a signed Monobank webhook has been stored successfully.
- Clears stale ecommerce object before each event.
- purchase ecommerce payload: transaction_id, value (UAH, not kopecks), currency, items with item_id, item_name, price, quantity.
- The amount is taken from the saved order and the bank finalAmount when available.

## Attribution captured and saved with orders
UTM parameters: utm_source, utm_medium, utm_campaign, utm_content, utm_term.
Click IDs: gclid, fbclid, gbraid, wbraid.
GA4 client_id is parsed from the _ga cookie. GA4 session_id is parsed from the session cookie _ga_* when there is exactly one unambiguous GA4 stream or the measurement ID is configured.
The public NEXT_PUBLIC_GA4_MEASUREMENT_ID can be supplied at frontend BUILD time. Default GA4 stream ID for cookie matching is G-CPJEJ15RRG (this does NOT send data). GA4 IDs can still be missing. Cookie consent/blockers can make them unavailable; no synthetic IDs are generated.
Attribution values and optional GA4 IDs are stored as order.attribution in the configured persistent store (Cloudflare D1, GitHub JSON or local) for possible future server-side Measurement Protocol dispatch.
This implementation deliberately does NOT send an additional server-side purchase to prevent double counting.

## Configure GTM (important)
The GTM container alone does not automatically send GA4 purchases.
1. In GTM container GTM-58GQ89JW, configure exactly one Google tag for measurement ID G-CPJEJ15RRG on all pages.
2. Create a GA4 Event tag with Custom Event trigger EXACTLY "purchase".
3. Enable Ecommerce from the Data Layer, or map ecommerce.transaction_id, ecommerce.value, ecommerce.currency, ecommerce.items.
4. Create exact-match Custom Event triggers and GA4 Event tags for view_item, add_to_cart, remove_from_cart, view_cart, begin_checkout, add_shipping_info, add_payment_info, purchase. Read the ecommerce payload from the Data Layer; never trigger purchase on a button click or page view.
5. Do not add additional purchase triggers on payment button clicks or result page views.
6. Verify in GTM Preview and GA4 DebugView, then SUBMIT and PUBLISH the container. Saved drafts do not send events.
7. In GA4 confirm the correct web stream, purchase key-event status and data retention (14 months where appropriate). Source code cannot inspect these administrative settings.

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
Use a controlled verified paid Monobank transaction to confirm the signed webhook, persisted paid status and a single dataLayer purchase with correct amount/items. Reload the return page to ensure no repeat.
A real payment/webhook test was NOT performed during development.

## Limitations
- GTM workspace publishing is outside this repository; a code change cannot prove that GA4 receives events.
- The verified browser purchase event is missed if a customer never returns from Monobank. A future Measurement Protocol integration must have durable order-level idempotency and replace, never duplicate, the existing browser purchase sender.
- Do not generate fake purchase events in production.
