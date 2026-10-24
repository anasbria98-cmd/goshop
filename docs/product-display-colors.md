# Optional product display colors

`Couleurs` is part of the shared Add/Edit product form, immediately after Caractéristiques. These display-only colors are independent of sellable Appareillage variants, photos, SKU, price and inventory. Rows accept a name and any six-digit HEX color, with a picker and delete action; no row-count cap is imposed.

## Migration required before deployment

Apply `supabase/migrations/202610240001_product_display_colors.sql` only after approval. It adds the nullable `products.display_colors` JSONB field and extends the existing transactional variant-product save function to include this field. It changes no category, product value, inventory, permission or RLS policy. Existing rows remain NULL. No production migration was applied during implementation.

- NULL / missing field: preserve existing active variant swatches for compatibility.
- `{ "enabled": true, "colors": [{ "name": "Cuivre", "hex": "#bc7341" }] }`: use the explicit list on cards.
- Disabled or empty list: show no swatches, even if sellable variants exist.

The storefront adapter supplies display colors to the existing shared product card. Compact circular styling and existing variant selection/cart logic are unchanged. Server-side validation runs inside the existing authenticated staff save action.

## Local verification

New/edit/delete/disable and save/reopen were exercised with the actual ProductForm and saveProduct action against a disposable local PostgreSQL adapter, without production credentials or data. Migration, persistence and legacy variant/stock/cart/order/RLS regressions run in isolated PGlite PostgreSQL. These tests do not exercise hosted Supabase Auth or production mail/session configuration.
