# RESET Clinic Shop — native Next.js storefront

The storefront is rendered entirely by Next.js and React.

## Design invariant

The migrated React storefront preserves the approved visual composition,
spacing, typography, imagery, responsive behavior and page hierarchy. Native
content snapshots are typed DOM data, not HTML strings, and are rendered by
React components.

## Architecture

- every public route resolves to a Next.js `page.tsx`;
- there is no raw HTML fallback or archived HTML in production;
- shared header/footer and migrated page trees are rendered through React;
- visual CSS and embedded imagery were deduplicated into normal static assets;
- product and catalogue screens read only from the admin-provider boundary;
- exactly one labelled test product exercises the complete store flow;
- placeholder WooCommerce products are not part of the native catalogue.

## Product catalogue

Archived WooCommerce products were placeholders and are not a data source.
The native storefront contains one reusable product template in
`components/catalog/ProductPageTemplate.tsx` and an explicit admin adapter
boundary in `lib/catalog/provider.ts`. Until the admin panel is connected, the
provider returns only `/product/test-product/`. All archived product URLs stay
unpublished and return `404`.

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000/`.
