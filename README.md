# RESET Clinic Shop — Next.js migration

This repository contains the standalone RESET Shop migration.

## Non-negotiable migration invariant

The source storefront in `legacy-source/` is the visual reference and must stay untouched during migration. The Next.js storefront must preserve the same DOM-driven visual composition, spacing, typography, imagery, responsive behavior and page hierarchy. No redesigns and no substitute product/editorial imagery are allowed unless explicitly approved.

## Current phase: fidelity baseline

The first Next.js layer server-renders the original saved storefront documents and serves the original downloaded image payloads. This establishes a stable 1:1 visual baseline before individual blocks are converted into React Server Components.

Next migration phases will replace legacy runtime behavior block-by-block while keeping the approved visuals unchanged.

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000/`.
