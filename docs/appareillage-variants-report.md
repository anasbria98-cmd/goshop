# Appareillage color variants — implementation report

Implemented and verified locally. The user approved the production database migration on 2026-10-15; it has now been applied to the existing Supabase project. The application code was already running on the live server.

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

The user explicitly approved this migration, which was applied on 2026-10-15. Any further production migration or deployment requires approval.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test` with the isolated PostgreSQL runtime enabled: **42 passed, zero failed, zero skipped**.
- `npm run build -- --webpack`: passed.
- `git diff --check`: passed.
- Browser tests at 1440px, 430px and 390px: color/image/SKU/price switching, keyboard selection, separate cart lines, quantity changes, refresh persistence, checkout color labels, image uploads, existing/custom color selection, new-product category gating, and unchanged simple-product UI. No horizontal overflow in the tested components; no browser console errors.
- Database tests use the original commerce schema, existing RLS definitions, checkout, and order workflow inside an isolated PostgreSQL engine. They cover migration preservation, existing/new products, atomic rollback, wrong-category/variant rejection, stock exhaustion and duplicate requests, cart records, immutable order snapshots, shipping/refunds, disabled colors, staff permissions, and existing backorder quantities.

The standalone test harness is stopped. The existing Next.js app now runs at `http://localhost:3000` against official native Supabase PostgreSQL, Auth, REST and Storage services. There are no replacement pages or frontend adapters in this preview. Production schema, permissions, unchanged catalogue records, and live editor loading were subsequently verified after the approved migration.

The real interface was verified with manufacturer photographs, actual authenticated Storage uploads from the admin editor, product/variant saves, repeated saves after a stock adjustment, persisted guest and signed-in carts, and the existing checkout. A local-only order captured Blanc/Noir SKUs, prices and image paths and reserved the correct two inventory rows. Its cancellation through the unchanged admin order workflow released those reservations.

All 100 existing products and their original inventory records were copied read-only and checked after testing: names, IDs, SKUs, prices, quantities and reserved quantities are unchanged. Existing images resolve to the same original public assets. Categories, brands, attributes and public settings were copied to preserve the existing interface. Customer records, production users and production orders were not copied. Two additional Galaxy demonstration products, their local prices/stocks, and a local-only admin account exist exclusively in the local database.

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

The approved production migration has been applied. No additional application deployment was performed during this database update.

## Production migration — approved 2026-10-15

- Applied the exact tracked migration transaction through the existing project's Supabase SQL Editor. The CLI did not have a management access token; the existing dashboard session was used.
- Confirmed all five new columns and both save functions are exposed through the production REST schema.
- Before/after fingerprints match for all 100 products, 100 inventory records, 102 images, variants, categories, and category assignments. Existing data was not changed and no demonstration data was added.
- Executed the color save function with an empty list as the existing authenticated administrator inside a transaction that was rolled back. No production color was created.
- Verified anonymous users cannot execute the save RPC, saves use caller permissions and the existing staff guard, and checkout remains service-role-only.
- The affected live admin product editor and public product page load successfully. The editor produced no console errors in the verification session.
- Actual color image upload, persistence, cart and checkout were tested end to end in the local environment; no real color or order was created in production for testing.
- This existing project has no `supabase_migrations.schema_migrations` table. It was not introduced by this change; inspect the live schema before any future bulk CLI migration push.
- Private verification artifacts and the prior checkout function backup are under `/private/tmp/goelec-production-*`, outside the repository.

## Variant editor UX refinement — local review

- Clickable swatches and a search box combine indicative common colors with saved catalogue shades; saved names/shades take priority.
- Existing rows open as compact summaries with price, reference, available stock, and active/completion state. Fields can be expanded independently.
- New drafts receive editable internal SKU suggestions. Saved references and manually entered references are never automatically overwritten.
- Duplication copies color/finish/price, resets stock and barcode, and requires a new real image. It does not save immediately.
- Upload filenames can suggest known color names. Optional photo analysis estimates a foreground shade in the browser; the administrator must confirm it. Source image bytes are never modified or sent to an AI service.
- Incomplete drafts and duplicate local references prevent submission with visible guidance, including when their fields are collapsed.
- Existing local admin uploads, confirmation, repeated saves, suggested/manual references, safe duplication, and validation were verified. The temporary Noir price change was restored to 52 DH.
- Layout checks at 1440px, 768px, 430px and 390px show no horizontal overflow. No browser console errors were observed.
- Typecheck, lint, webpack production build, all 42 tests, and diff checks pass.
- Changed editor files only: `app/admin/products/_color-variants.tsx`, `app/admin/products/product-form.tsx`, `components/product-variants.css`; new `lib/color-suggestions.ts` and `tests/color-suggestions.test.mjs`.
- These UX refinements and the continuation fixes are included in the requested main-branch update. No additional deployment, production database change or production product edit was performed.

## Final continuation verification

Preserved all existing uncommitted UX work and finished inside the original app, with no standalone product page or separate website.

- Created a second local-only product through the actual new-product form, selected the existing Galaxy category, uploaded original Blanc/Noir manufacturer photographs, and published both variants atomically.
- Confirmed inherited Blanc price 45 DH, Noir price 52 DH, unique suggested references, stocks 3 and 4, saved variant IDs, and refresh persistence.
- Fixed a catalogue-only gap: products created with variant photos and no separate main gallery image now use an available variant photo for their thumbnail. Approved main images and simple-product behavior are preserved.
- Added Appareillage-only save feedback. Global SKU/barcode/address conflicts and stock errors return inline messages rather than replacing the editor with a server error. Drafts remain intact; Next.js auth/success redirects still propagate. Native testing confirmed a cross-product SKU conflict rolls back, preserves the draft, and clears its message after a corrected successful save.
- Desktop/mobile selection switches the actual photo, selected SKU, price, availability and quantity limit. Original photograph dimensions remain 700 × 800 without distortion.
- Cart refresh retained one Noir and two Blanc units as separate lines, total 142 DH. Existing checkout completed a local-only order, GO-2026-000002.
- PostgreSQL and the unchanged admin order page confirmed exact SKUs, prices, quantities, variant IDs and image snapshots. Reservation counts were Noir 1 and Blanc 2; cancellation released both to zero. Physical stocks remained 4 and 3.
- Edited Noir stock to zero through the admin, verified mobile purchases are disabled while its real image remains visible, then restored stock to 4 through the same editor.
- Existing catalogue checks still match all original 100 product names/references/prices and 100 inventory records.
- Final TypeScript, lint, all 42 tests (zero failures/skips), webpack production build and diff checks passed.
- New fixes are limited to `lib/catalog.ts`, `lib/product-variants.ts`, `lib/variant-input.ts`, the Appareillage action wrapper in `app/admin/actions.ts`, and their existing variant editor/tests.
- No production product, order, stock, schema or deployment was changed in this UX/continuation work. The previously approved production migration remains applied. The completed source changes are included in the requested main-branch update.

Review:
- Existing-product editor: http://localhost:3000/admin/products/584c2e40-7821-4563-acd9-5bef5bffe2f3#variants
- Newly created product: http://localhost:3000/produit/lap-galaxy-creation-locale-variantes
- New-product editor: http://localhost:3000/admin/products/4979e54f-6e6c-456e-8dcf-256ddff38dc5#variants

Screenshots are under `/private/tmp/goelec-variant-ux-*` and `/private/tmp/goelec-variants-final-*`; local order/database proof is `/private/tmp/goelec-local-stack/ux-order-proof.json`.
