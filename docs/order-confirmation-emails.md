# Order confirmation emails

Checkout saves the order with the existing `create_order_from_cart` RPC, then makes a best-effort server-side Resend request before the existing confirmation redirect. No order creation, pricing, stock, UI or schema changes.

## Required configuration (not applied)

Set `RESEND_API_KEY` in the application's secure **server runtime environment** (Dokploy Environment), never as a `NEXT_PUBLIC_` variable or in Git. Verify the sending domain `goelec.ma` in Resend using the exact DNS records provided by Resend before enabling delivery. Sender is fixed to `GO ELEC <noreply@goelec.ma>`; replies go to `contact@goelec.ma`.

## Behavior

- Reads only the newly saved order and its item/address snapshots. Never sends browser-supplied prices.
- French HTML and plain text include order number/date (Morocco timezone), customer name, products/variants, quantities, saved unit/line prices, grand total, optional delivery address and phone.
- Uses the existing public production PNG logo; no arbitrary logo URL or user HTML.
- Missing configuration, database read failure, provider rejection and network timeout do not reject checkout. Only fixed diagnostic codes/HTTP status are logged; no customer data, keys or raw errors.
- Uses an eight-second request timeout and `order-confirmation/<order UUID>` as the provider idempotency key. No new orders are created by the mail helper.
- Best effort only: no durable retries, delivery tracking or new tables. Resend acceptance is not proof of inbox delivery.

## Local verification

Tests mock Resend; no real customers receive messages. Coverage includes saved recipient/sender/content, HTML escaping, variants, optional address/phone, missing key, provider rejection, snapshot failure and network failure. The template is visually checked in desktop/mobile browser previews, not a full Outlook/Gmail client matrix. Live delivery requires a verified Resend domain and a securely configured key; neither was changed by implementation.
