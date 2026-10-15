# Appareillage color variants — implementation report

Implemented and verified locally. The new migration has **not** been applied to production. Production deployment requires approval.

## Functionality

- Color management applies only to Appareillage and its descendants, including secondary category assignments and future products.
- The French product editor supports existing/custom color names and HEX codes, real image uploads, optional finishes, individual SKU/barcode/prices, stock edits, and disabling colors. New products can configure multiple colors before saving.
- Swatches switch the product image immediately without a page reload, with a short transition respecting reduced motion. The selected price, SKU and availability update together.
- Product cards with colors direct customers to choose a variant. Simple products retain their existing purchase behavior and appearance.
- Cart keys distinguish colors of the same product. Selection, image, SKU and price survive navigation and refresh. Disabled/deleted selections are rejected and stale variant lines are removed during cart restoration.
- Checkout reads price and availability from the database, snapshots the selected color/finish/image/reference, and reserves its inventory row. Deterministic row locks and aggregated duplicate lines prevent overselling tracked stock.
- Existing shipping/refund/cancellation processing already uses variant inventory and is reused unchanged.
- Editing metadata preserves stock unless an administrator explicitly changes it. Stock edits detect concurrent changes, reject reductions below reserved quantities, and use the existing movement history.

## Migration

`supabase/migrations/202610140001_appareillage_color_variants.sql`

Adds nullable `color_name`, `color_hex`, `finish`, and `image_path` fields to existing `product_variants`. Adds a default-false `products.color_variants_enabled` flag so disabling every color cannot accidentally enable base-SKU purchases.

Adds category-scope and staff-only transactional save functions, and extends the existing service-role-only checkout function. Existing RLS policies, roles, storage buckets, prices, stock, and historical variant records are preserved. No existing product or image is deleted by the migration. Product/category assignments saved through the new workflow follow the existing product editor behavior.

Apply this migration before using real Supabase saves for the new color controls. A production migration/deployment requires the user's explicit approval.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test` with the isolated PostgreSQL runtime enabled: **36 passed, zero failed, zero skipped**.
- `npm run build -- --webpack`: passed.
- `git diff --check`: passed.
- Browser tests at 1440px, 430px and 390px: color/image/SKU/price switching, keyboard selection, separate cart lines, quantity changes, refresh persistence, checkout color labels, image uploads, existing/custom color selection, new-product category gating, and unchanged simple-product UI. No horizontal overflow in the tested components; no browser console errors.
- Database tests use the original commerce schema, existing RLS definitions, checkout, and order workflow inside an isolated PostgreSQL engine. They cover migration preservation, existing/new products, atomic rollback, wrong-category/variant rejection, stock exhaustion and duplicate requests, cart records, immutable order snapshots, shipping/refunds, disabled colors, staff permissions, and existing backorder quantities.

The standalone test harness is stopped. The existing Next.js app now runs at `http://localhost:3000` against official native Supabase PostgreSQL, Auth, REST and Storage services. There are no replacement pages or frontend adapters in this preview. Production verification remains deferred until an approved rollout.

The real interface was verified with manufacturer photographs, actual authenticated Storage uploads from the admin editor, product/variant saves, repeated saves after a stock adjustment, persisted guest and signed-in carts, and the existing checkout. A local-only order captured Blanc/Noir SKUs, prices and image paths and reserved the correct two inventory rows. Its cancellation through the unchanged admin order workflow released those reservations.

All 100 existing products and their original inventory records were copied read-only and checked after testing: names, IDs, SKUs, prices, quantities and reserved quantities are unchanged. Existing images resolve to the same original public assets. Categories, brands, attributes and public settings were copied to preserve the existing interface. Customer records, production users and production orders were not copied. One additional Galaxy demonstration product, its local prices/stocks, and a local-only admin account exist exclusively in the local database.

Native image switching and layout checks passed at 1440px, 390px and 430px with no horizontal overflow. Variant images retain their natural proportions. The default selection now prefers an available variant, and saved color editor data resets cleanly after successful saves. The previous localhost Origin mismatch is avoided by binding the development server to `localhost`; its security check was not changed.

The application dependencies, package scripts and build configuration are unchanged. PGlite and esbuild were installed only under `/private/tmp` as temporary test tools. To repeat the database tests, set `GOELEC_TEST_PGLITE_PATH` to the absolute path of a temporary PGlite installation's `dist/index.js` before `npm test`; without it, the isolated database suite is explicitly skipped.

## Exact files changed or added

- `app/admin/actions.ts`
- `app/admin/products/[id]/page.tsx`
- `app/admin/products/_category-selector.tsx`
- `app/admin/products/_color-variants.tsx`
- `app/admin/products/new/page.tsx`
- `app/admin/products/product-form.tsx`
- `app/api/cart/route.ts`
- `app/checkout/actions.ts`
- `app/checkout/checkout-form.tsx`
- `components/cart-view.tsx`
- `components/product-card.tsx`
- `components/product-detail.tsx`
- `components/product-variants.css`
- `components/store-provider.tsx`
- `lib/admin-product-variants.ts`
- `lib/catalog-model.ts`
- `lib/catalog.ts`
- `lib/database.types.ts`
- `lib/product-variants.ts`
- `lib/variant-input.ts`
- `supabase/migrations/202610140001_appareillage_color_variants.sql`
- `tests/product-variants.test.mjs`
- `tests/variant-database.test.mjs`
- `docs/appareillage-variants-report.md` — this report.

## Scope confirmation

No unrelated features or production data were intentionally modified. Header, navigation, footer, branding, hero, categories, prices, stock records, authentication, and existing dashboard navigation were not redesigned or edited. Changes in shared product/cart/checkout components are limited to variant support.

## Integrated local review links

- [Existing storefront](http://localhost:3000/)
- [Galaxy product with colors, inside the original product page](http://localhost:3000/produit/lap-galaxy-triple-prise-2p-demo-local)
- [Existing admin product editor](http://localhost:3000/admin/products/584c2e40-7821-4563-acd9-5bef5bffe2f3#variants)

Original manufacturer photographs: [LAP Galaxy Triple Prise 2P](https://lap-electric.ma/produit/triple-prise-2p/). The white, black and gray files are used without generation or recoloring.

Local runtime tools/data live under `/private/tmp/goelec-local-stack`. The app's `.env.local`, dependency manifest, scripts and build configuration were not changed. `launch-app.mjs` supplies local service configuration to the running Next.js process. The admin review tab is signed into the local-only account; the real production password/account is untouched.

No production migration or deployment has been performed.
