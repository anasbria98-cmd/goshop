# Category-independent variant images

Color variants are available in Add/Edit Product via “Configurer des variantes de couleur (toutes catégories)”. Appareillage keeps its existing default-on convenience; it is not an eligibility rule. Existing variants are not converted or removed.

Each color row can upload into the existing `product-images` bucket or select an image from that product's gallery. General variants use the same bucket and optional `image_path` column, including an image-only save action for existing rows. An empty assignment uses the main product image. Gallery removal preserves files still referenced by variants.

Before deploying, apply `202610310001_all_category_variant_images.sql`. It replaces the category-gated save functions and extends existing general-variant/order validation for optional images and all categories. It adds staff-only validation/image-save RPCs; no tables, columns, stored products, stock, prices, category links, permissions on existing functions, or historical order rows are migrated. Checkout still snapshots server-side SKU, price and inventory; its eligibility check now accepts the variants the admin can configure.

Local verification uses isolated PostgreSQL via `GOELEC_TEST_PGLITE_PATH` and real admin/storefront components with disposable local fixtures. No production migration or data mutation is part of implementation.
