# Homepage slider management

Local implementation only; no production migration/deployment is authorized yet.

## Administration

`/admin/sliders` (Gestion des Sliders) is restricted to `admin` and `super_admin`.
The two lists manage the existing large left and small right carousels. Create/edit a
banner, upload or replace JPG/PNG/WebP (8 MiB maximum), enter alt text, choose an
optional category/product/custom link, activate/deactivate, or delete with an inline
confirmation. Drag the handle on desktop; the arrow buttons provide keyboard and
touch-friendly ordering. Reordering is saved immediately and atomically per location.
Saving a banner moved to the other location appends it there.

Original media are never deleted by these controls. Uploaded files are uniquely
named and remain in Storage after replacement/deletion, avoiding broken shared
references. A successful upload is retained in the form after a metadata validation
failure, allowing a retry without uploading twice.

## Database and rollout (requires approval)

Migration: `supabase/migrations/202610160001_homepage_sliders.sql`.
It adds only the `homepage_slides` table, its RLS policies, an admin-protected reorder
RPC, and the dedicated public `homepage-slides` image bucket/storage policies.
Public callers can read active rows only. Staff/customers cannot write rows or files;
admins can also read inactive rows. All mutations additionally enforce role checks
in server actions. Provider/service secrets are never used in the browser.

The migration seeds Omega then Galaxy in `primary`, Karla then Millenium in
`secondary`, retaining the original `/promotions/*.png` assets and current category
relationships. Product/category destinations resolve against existing published
products/active categories, using the existing hierarchical category paths.

The homepage reads active slides server-side on each dynamic request. Existing
carousel CSS, 4.5-second autoplay, reduced-motion behavior, swipe, arrows and dots
remain in place. The original Galaxy artwork keeps its existing presentation;
replacement artwork does not inherit the original image's pseudo-element overlays.
No-link slides render as images instead of empty links. Zero active slides leave the
corresponding slot empty without resurrecting disabled banners. The original four
banners are a compatibility fallback if Supabase is unavailable or the migration has
not yet been applied.

After approval, apply the migration to the intended production Supabase project,
then deploy the reviewed application through the existing workflow. Do not change
Dokploy configuration or run any product/category/data import. Before approval,
keep all tests and migrations on localhost only.

## Verification

- TypeScript, lint, webpack production build, `git diff --check`.
- `npm test`; run isolated PostgreSQL tests with:
  `GOELEC_TEST_PGLITE_PATH=/path/to/pglite/dist/index.js npm test`.
- Database tests cover original seeds/order, active-only reads, denied customer/staff
  mutations, admin Storage writes and transactional reorder validation.
- Browser tests: upload and image preview, create/edit/replace, all link destinations,
  location changes, drag and arrow ordering, activation/deactivation, deletion,
  refresh persistence, mobile admin layout and original homepage carousels.
