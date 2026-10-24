# Category and menu management

Local implementation only; do not deploy before the migration is approved/applied.

## Dashboard

`/admin/categories` keeps the existing category form, tree, image/icon, SEO and numeric sibling display order controls. It adds:

- Visible / active: existing `is_active` flag (catalogue visibility).
- Afficher dans les menus: existing `show_in_navigation`, now honored on every navigation surface. A hidden ancestor hides its branch; descendants are never promoted.
- Independent top navigation, all-categories and mobile checkboxes.
- Optional short top-menu label and desktop column (1–3), to preserve the former presentation without hardcoding names in components.

Categories with children remain expandable; leaf top-menu items link directly to their category page. Parent choices exclude the current category and all its descendants; the server validates the selection and the existing database cycle trigger remains in effect. Slugs remain unchanged unless explicitly edited. Changing a slug/parent intentionally changes that branch's canonical path; no automatic URL aliases are introduced.

## Shared source

`getCategoryNavigation()` reads active category rows from Supabase on the server. `categoryNavigation()` supplies top, all-categories and mobile views from the same ordered hierarchy. The header and mobile accordion receive the same server snapshot; `/api/mobile-categories` returns the same mobile view for compatibility. No hardcoded category tree or special Intérieur fetch remains.

Sibling order always wins, even if reordered items cross old desktop column boundaries. Top-menu flags may also expose nested categories as top-level navigation entries while retaining their full existing path. Per-channel visibility applies to that channel's branch; the global menu checkbox suppresses all channels.

## Required production migration

`supabase/migrations/202610240002_category_menu_controls.sql`:

1. Adds `show_in_top_navigation` (default false), `show_in_all_categories` (default true), `show_in_mobile_menu` (default true).
2. Adds nullable `navigation_label` and `navigation_column` (default 1, checked 1–3).
3. Copies the former desktop top-menu choices, compact label and column grouping into these presentation fields for matching existing paths. Retains the promotional lightning icon using the already-existing `icon` field when empty.
4. Does not create/delete categories, rename categories, change slugs/parents/order, modify products or `product_categories`, or alter RLS/permissions.

Apply once to the existing database before deploying the application. No production migration has been run as part of this local task. No SMTP/auth/deployment configuration changes are needed.

## Verification

- Pure tests cover ordering, independent channel visibility, hidden/inactive ancestors, cycles/orphans, nested links and reparenting, and stable desktop column traversal.
- Isolated PostgreSQL tests apply the actual migration, compare products/assignments/RLS before and after, exercise edits and cycle rejection, and reject anon/non-staff writes.
- Browser verification uses the actual category page, save action, Header and mobile accordion against a disposable PostgreSQL adapter (no hosted credentials): create/edit/order/reparent, nested child creation, independent all-menu exclusion, and shared desktop/mobile links. Tested mobile widths 360/390/430px without overflow.
- The adapter only replaces Next server boundaries and Supabase transport; production Auth/session behavior is unchanged and not tested against production.
