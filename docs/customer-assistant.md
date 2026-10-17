# GO ELEC catalogue assistance

The existing floating widget now accepts free-form customer questions and retrieves real, published GO ELEC catalogue information on demand through `app/assistant-actions.ts`. It does not call OpenAI, Gemini, an Edge Function, or any paid AI provider. It is a contextual catalogue search/retrieval assistant, not a generative language model. No API key, migration, business-data change or deployment configuration change is required.

## Verified sources and access

`lib/customer-assistant-source.ts` uses only the public Supabase configuration with an anonymous client, even if the visitor is staff. It paginates active products with a non-null publication date, reads their names/references, actual prices, brands, active categories, and publicly readable inventory. Active, complete Appareillage color variants use their own actual prices and inventory. Absent price or inventory data is explicitly unknown; missing inventory is not assumed to mean zero stock. Only the matching small result list is returned to the browser, never the whole catalogue or database records. There is no access to users, orders or service-role credentials.

Store answers reuse `data/information.ts`, the existing verified footer/FAQ contact details, and the public support email/business address settings when configured. The delivery source only confirms delivery in Morocco depending on zone, weight and volume, with fees and timing confirmed before dispatch. It does not confirm city-specific coverage, nationwide coverage, free delivery, a delivery fee or delivery time. The assistant explicitly refers customers to GO ELEC for those details. It does not promise WhatsApp order acceptance or a specific payment method.

## Natural questions and context

`lib/customer-assistant-model.ts` normalizes accents/plurals, technical amperages and RO2V/R02V/R2V aliases. It matches product/brand/category/reference terms, filters actual prices by budgets (strictly below for “moins de”), and returns product links and current stock information. Similar-product requests use the most specific known category and exclude the reference product. Recommendations are catalogue matches, not electrical suitability guarantees.

The bounded in-memory context contains query terms, result IDs and a budget, not invented assistant facts. Follow-up amperages replace previous amperages, a brand change replaces the old brand, and price/link requests reuse the topic. Multiple matching references remain visible instead of pretending one was uniquely identified. Customers can identify “le premier”, give a reference, or use the currently opened product page as context. Quick questions remain shortcuts, but all typed product questions use live retrieval rather than prepared product answers. Unknown questions ask for clarification or offer human help.

## Limits

There is no general language model: spelling not recognized by the normalization, complex project constraints and unsupported phrasing can require clarification. It does not infer undocumented specifications, technical compatibility, legal identity, business hours, private order status or delivery promises. It cannot confirm missing source data. Prices/stock reflect the catalogue at retrieval time and may change; checkout continues to revalidate them. Conversation context disappears on refresh. Questions are sent to the existing app server for retrieval, not to an AI provider, and this feature does not persist conversations in the database.

The existing collapsed/expanded design, lazy loading, keyboard controls, French/Arabic interface and transactional-page exclusions are preserved. The retired Edge Function remains unused and unchanged.

## Verification

Run typecheck, lint, the test suite (including isolated database tests when available), webpack production build and diff checks. Catalogue-assistant regression tests cover natural product matching, technical filters, context, budgets/variants, similar-product exclusions, verified policies/contact data, unknown facts and hostile input. Browser verification covers real Hager/RO2V questions, follow-ups, product links, delivery/contact answers, loading/failure states and responsive layout.
