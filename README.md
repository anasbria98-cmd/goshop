# Goshop.ma — Phase 1

A French Moroccan electrical retail storefront built with Next.js 16.3.8 (latest stable verified at implementation), App Router, React, TypeScript, Tailwind CSS 4, and Lucide icons.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Validate with `npm run typecheck` and `npm run build`.

The production build exports to `out/` for static hosting. `npm run start` is for a future Node deployment after removing `output: 'export'`; use a static file server for the current export.

## Organization

- `app/`: page routes, shared layout, metadata, responsive CSS.
- `components/`: header/mega menu/mobile drawer, product cards and carousels, homepage sections, catalogue filters, cart, detail page, footer, store context.
- `data/catalog.ts`: typed category and product records, DH formatting, editable contact placeholders.
- `data/information.ts`: original informational copy and clearly marked legal/contact placeholders.
- `public/products/`: compressed WebP demonstration imagery and source provenance.
- `.openai/hosting.json`: private Sites identity and static output configuration.

## Implemented routes

`/`, `/categorie/[slug]` (10 departments), `/produit/[slug]` (12 examples), `/recherche`, `/panier`, `/favoris`, `/compte`, `/checkout`, `/informations/[slug]`.

Search matches names, brands, references and category names, ignoring accents/case. Catalogue filters support department, brand, maximum price, stock, sorting and promotional/new selections. Empty departments intentionally show an empty catalogue rather than unrelated products. Subcategory labels are examples; their mega-menu links open the parent department pending a complete taxonomy.

The cart and favorites use the `goshop-store` localStorage key. Data is validated on hydration; quantities are bounded by stock, unavailable products cannot be added, and the state layer is replaceable by a backend. These are device-local selections, not server orders. The optional feature-detected WebMCP `read_goshop_cart` tool exposes a read-only cart summary.

## Phase 1 boundaries

- All prices, references, ratings, reviews, stock and product photos are illustrative. Photos may show a different reference or variant.
- Replace temporary third-party product photos with authorized, exact-SKU merchant assets before commercial release. Provenance is in `public/products/sources.json`; redistribution licenses are not confirmed.
- Account/authentication, orders, checkout, payment providers and newsletter delivery are not connected. Their screens state this explicitly; no money or email addresses are collected.
- Contact details, company/legal documents, delivery rates and return rules must be finalized by the merchant.
- Next Image handles dimensions, loading and layout. Local source assets were resized and compressed to WebP. Runtime image optimization is disabled because this Phase 1 is a static export; enable it on a future Next server or configure a CDN loader.
- No logo, imagery, source code or copy from 123elec is used.

## Future backend integration

Keep the `Product` and `Category` contracts while replacing data imports with a server data adapter. Replace StoreProvider mutations with authenticated cart API calls. Validate inventory and prices on the server at checkout; never trust client totals. Remove static export mode when enabling dynamic inventory/authentication. Generate catalogue routes from the real data source, and add exact product specifications and authorized imagery.
