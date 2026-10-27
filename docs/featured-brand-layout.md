# Visual featured-brand layout

Admin → Marques → **Les marques qui font la différence** is the only placement
editor. Brand identity/catalogue fields remain in the existing editor below it.

- Drag a handle to an empty case to move the logo, or to an occupied case to swap
  those two logos. Other cases never shift.
- On touch devices or with the keyboard, select **Déplacer**, then **Placer ici**
  or **Échanger ici**. Available brands can only be placed in empty cases.
- **Retirer** removes the logo from the section, not the brand or its products.
- Empty cases, including trailing cases, persist. Adding/removing the last empty
  case is explicit; no automatic filling or alphabetic ordering occurs.
- Press **Enregistrer la disposition** to publish the pending layout. Until then,
  the storefront retains the last saved layout. **Annuler les modifications**
  restores it. Concurrent/stale saves are rejected rather than overwriting edits.
- New brands retain the existing hidden/unpositioned defaults. Inactive brands
  are not offered for new placement; an already placed inactive brand is labelled
  as hidden on the storefront, retaining its slot.

## Data and rollout

Requires `202610270002_visual_brand_layout.sql`, after
`202610270001_featured_brand_controls.sql`. Apply only after deployment approval.
The migration adds a single public-readable `featured_brand_layout` extent row,
seeded from the highest existing occupied slot, and a staff-authorized atomic save
RPC. Existing brand positions and all product-brand relationships are untouched.

Brand placement remains in `brands.show_in_featured_brands` / `display_order`;
`featured_brand_layout.slot_count` preserves trailing empty cases. The shared
catalogue loader and `BrandsSection` use both on homepage and product pages. Admin
and storefront reuse the same brand artwork and existing responsive grid styles.
The save RPC validates IDs/duplicates, checks the expected previous layout and
uses a transaction to release/reassign only changed slots safely during swaps.
Existing brand RLS permissions remain unchanged; anonymous/customer writes fail.

Local checks include pointer drag, touch-friendly placement, keyboard swap,
save/reopen, add/remove, duplicate rejection, trailing/fully empty grids,
concurrent-save rejection, permissions and unchanged product/brand relationships.
Database tests use an isolated PGlite database, never production:

```
GOELEC_TEST_PGLITE_PATH=/path/to/pglite/dist/index.js npm test
```
