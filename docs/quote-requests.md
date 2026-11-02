# Demandes de devis GO ELEC

## Scope

`/demander-un-devis`, a desktop header link and an entry at the top of the existing mobile drawer. Existing catalogue, account, checkout and admin behavior are unchanged. The category selector reads the existing active category hierarchy; the only non-category choice is a general/multiple-category request.

## Production prerequisites — not applied locally to production

Apply `supabase/migrations/202611020001_quote_requests.sql` to the existing project only after approval. It adds:

- `quote_requests`, with customer contact/need, category snapshot, private attachment paths, processing status and timestamps. It does not update existing rows in any existing business table.
- Server-only atomic `claim_quote_request` for duplicate protection and shared IP-hash rate limiting (5 new requests / 15 minutes, 20 / day). Retries reuse an idempotency UUID and matching payload hash. In-flight claims cannot be processed twice; interrupted processing can retry after 10 minutes.
- Private `quote-attachments` bucket, 5 MiB per file, JPEG/PNG/WebP/PDF only. No public read or browser upload policy. Staff read is enforced with the existing `is_staff()` permission.

The Next.js server reuses existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. No secret belongs in client code. The production reverse proxy must preserve the original Host and sanitize forwarded client-IP headers for IP-based abuse limits. Missing IP groups requests into a shared fallback limit. No raw IP is stored.

## Notification

Optional existing server variable: **`RESEND_API_KEY`**. Sender is `GO ELEC <noreply@goelec.ma>`, recipient is the existing official contact `contact@goelec.ma`, Reply-To is the customer's validated email. The sender/domain must be verified in Resend. If the key is absent or delivery fails, the request remains saved and the server logs only a non-sensitive error code. No email is sent from the browser. No delivery promise or customer email confirmation is shown.

Files are not public or attached to notification emails. Authorized staff can inspect requests in the existing Supabase dashboard and read/download files through its private Storage UI. This feature does not add an unrelated admin inbox. Follow the business's retention policy for customer requests and failed-upload remnants; no automatic destructive cleanup is installed.

## Validation/security

Both client and server validate required fields, lengths, email and Moroccan +212 / 0-prefixed phone numbers. The server checks category activity, Origin, file extension/MIME/signature, and bounded multipart body size. Up to 3 attachments, 5 MiB each and 8 MiB total. Filenames cannot determine storage paths; generated paths are request-owned. Inputs are escaped in notification HTML. SVG/HTML/executables are rejected. Files are private; content signatures are format checks, not antivirus scanning.

The server claims a request, uploads private files, then marks it received. A failed upload/save returns an explicit error, preserves the form, marks the claim retryable, and sends no success notification. A retry of an already received request returns the same success without creating a row or notifying twice. Resend uses its idempotency key as a further safeguard.

## Local verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build -- --webpack`.

The isolated PostgreSQL migration/RLS test can be enabled with `GOELEC_TEST_PGLITE_PATH=/absolute/path/to/@electric-sql/pglite/dist/index.js npm test`.

Use an isolated local Supabase/test backend for submission checks. Never submit dummy quotes, apply this migration, or send notification emails against production during local verification. Temporary local fixtures/credentials must not be committed.
