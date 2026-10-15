# Assistant GO ELEC

## Scope and architecture

The existing storefront mounts a small floating help button. The chat code loads only on first opening, uses the existing GO ELEC CSS tokens, and does not change page layout. It is not mounted in the admin; authentication, account, cart and checkout screens keep their existing controls unobstructed. French and Arabic storefront languages are supported.

Browser → the existing project's `/functions/v1/goelec-assistant` → anonymous Supabase catalogue REST reads → OpenAI Responses API. No Next.js API route, server action, SDK dependency, database migration, table, policy or deployment-configuration change was added. The current Next.js configuration is preserved, including its existing server-rendered routes; this feature does not require that runtime for its backend.

Only the public Supabase URL and publishable key already used by the storefront enter the browser. AI credentials belong exclusively in Supabase Edge Function secrets. No service-role key is used by the function. Customer Auth tokens/cookies are not forwarded. Product reads use anonymous RLS and explicitly require `active` status and a publication date in the past.

## Required activation secret

The existing project's Edge Function Secrets page was checked during implementation: **no custom secrets exist**. Live AI generation therefore remains unavailable until the owner adds:

- **`OPENAI_API_KEY`** — a real OpenAI API credential, entered directly in the existing Supabase project's Edge Function Secrets page. Never put it in a `NEXT_PUBLIC_` variable, browser JavaScript, Git, chat, or Dokploy frontend configuration.

Optional secrets:

- `OPENAI_MODEL`: a Responses/Structured Outputs compatible model available to the account. Default: `gpt-4o-mini`.
- `ASSISTANT_ALLOWED_ORIGINS`: comma-separated exact storefront origins. Defaults: `https://goelec.ma`, `https://www.goelec.ma`, and the existing `https://goshop-kappa.vercel.app`. For local function testing only, include the actual localhost origin in the local runtime environment.
- `ASSISTANT_PUBLIC_KEY`: only if the storefront's existing publishable key is absent from Supabase's injected `SUPABASE_PUBLISHABLE_KEYS`. This is the same public key, not a service-role secret. Legacy injected `SUPABASE_ANON_KEY` is also accepted.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_PUBLISHABLE_KEYS` are existing Supabase runtime defaults. Never substitute a service-role credential for the anonymous catalogue key.

## Function deployment

The function source is `supabase/functions/goelec-assistant/index.ts` plus `core.mjs`. Publish both files together to the existing Supabase project. The browser editor can deploy these files without changing Dokploy or the app configuration. Alternatively, with an authorized Supabase CLI session:

```sh
supabase functions deploy goelec-assistant --project-ref wcwkmeersqxnqystlmft --no-verify-jwt
```

This function serves anonymous shoppers and validates the public `apikey` itself. Disable the legacy JWT gateway check **only for this new function** so the existing publishable key works without a customer login. No other function, Auth setting or RLS policy should change. Exact-origin CORS, bounded input, timeouts and per-instance rate limits apply. CORS/public keys are not proof of identity; throttling is best-effort across Edge instances. Configure provider account spending limits before adding the AI secret.

Pushing `main` lets existing Dokploy automation ship the widget; Dokploy does not automatically publish Supabase function source. Adding the server-side secret activates generation without a new storefront build.

The function was published to the existing project through its browser editor on 2026-10-15, with both files compared against repository source before deployment. Only the new function uses its public-key validation instead of the legacy JWT gateway. Live endpoint checks confirmed: preflight `204`, existing public key `503 assistant_unavailable` (expected until the AI secret is supplied), wrong key `401`, and foreign origin `403`. Deployment and runtime startup succeeded; no provider request was made without a real secret.

## Catalogue grounding

- Reads existing active brands/categories and their descendants; searches names, SKU, manufacturer reference and short descriptions. No duplicate catalogue is created.
- Returns up to five candidates from a bounded search, not an exhaustive inventory. A missing result must never be described as proof that GO ELEC does not sell an item.
- The model can choose only returned product IDs. Card names, brands, descriptions, base prices and `/produit/...` links are reconstructed from database results, never model-generated fields. Links are validated again in the browser. Inventory is not supplied; availability and variant prices must be checked on the actual product page.
- Instructions limit prose to GO ELEC guidance, request clarification for vague needs, reject catalogue/message prompt instructions, and forbid invented commercial facts. Prose with numbers/URLs is replaced with neutral guidance; exact product facts remain in the cards. As with any AI guidance, electrical installation/design decisions require a qualified professional.
- Chat history stays in component memory, is bounded, and is not written to a database or browser storage. Requests use `store: false`; no messages or credentials are logged by this function. OpenAI processes the submitted conversation and relevant public catalogue records.

## Verification

- Existing assistant integration tests cover malformed/oversized messages, CORS, public-key checks, anonymous REST queries, publication filtering, category descendants/brands, exact database cards/links, invented ID rejection, numeric/URL prose guarding, provider/catalogue failure, no-key behavior, rate limits and browser request/response validation.
- Actual anonymous lookups against local Supabase returned Galaxy, the Hikvision speaker, Éclairage and Nexans records with their existing prices and valid product routes. No record was written.
- Browser checks cover opening, closing, Escape/focus return, Enter submission, loading, graceful unavailable response, desktop and mobile layout. The existing product swatches still switch the original photo/SKU/price.
- TypeScript, lint, all 49 tests (zero skipped), webpack production build and diff validation passed during implementation.
- A real provider-generated reply cannot be verified until `OPENAI_API_KEY` is added. Automated success tests use explicit provider fixtures; they are not a production AI fallback or an alternative storefront.

Official references: [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets), [Supabase function authentication](https://supabase.com/docs/guides/functions/auth), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
