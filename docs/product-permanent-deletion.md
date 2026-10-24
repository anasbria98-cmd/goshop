# Permanent product deletion (local implementation)

Not deployed. Requires `202610240003_safe_product_deletion.sql` before deployment.

## Admin UX

Admin/super-admin users see Supprimer as the last red product Actions item for every product status. Staff do not see it. Clicking only opens a native modal dialog containing the current product name/SKU and an irreversible-deletion warning. The destructive submit button requires an explicit confirmation checkbox. Cancel/Escape restore focus; submitting disables repeat/cancel actions while pending. Failures remain in the modal with an explanation.

## Security and consistency

The server action rechecks the authenticated admin/super-admin role. The database RPC also checks the current Auth identity/admin role and explicit confirmation, locks the product/variant/inventory rows, verifies the displayed name/SKU still match, and deletes within one transaction.

The migration replaces the staff ALL products policy with staff INSERT/UPDATE policies; existing public/staff SELECT is preserved. No DELETE policy is added: direct browser REST deletion is unavailable even to an admin. Only the narrowly scoped security-definer RPC permits authenticated admin deletion. No service-role credentials are introduced.

A BEFORE DELETE history guard also protects direct privileged deletes. It blocks products referenced by order items (product ID, variant ID or matching main/variant SKU), inventory movements, reserved inventory, or homepage slider product links. Cross-product inventory/cart references to a target variant also block deletion, avoiding cascades into another product. Historical orders/items are never deleted or nulled. Unknown restrictive dependencies abort and roll back the operation.

Existing foreign keys remove only target-owned metadata: category assignments (not categories), image metadata, attribute values, variants, unreserved inventory, reviews, favorites, cart items and promotion-product joins. Parent carts/promotions are retained. Existing database auditing remains enabled. Stock movements cause refusal rather than deletion.

Storage files/media library assets are deliberately retained: paths can be shared and are not exclusively owned through a storage FK. This avoids deleting another product's image or a reusable library asset. No storage bucket/policy changes are needed.

## Verification

Isolated PostgreSQL tests apply the actual migration and cover all three product statuses, confirmation/stale identity rejection, anon/customer/staff denial, direct REST-style DELETE denial, safe dependent cleanup, untouched control products/categories, protected orders/items, reserved stock, stock movements, linked banners and cross-product relations. Browser tests use the actual product list and modal with the real server action and guarded RPC against disposable local PostgreSQL; only transport/Next server boundaries are adapted. No production deletion or migration is part of implementation testing.
