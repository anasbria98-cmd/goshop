# GO ELEC store assistance

The floating “Besoin d’aide ?” widget provides prepared store guidance entirely in the browser. **No AI service, API request, API key, paid subscription or backend is required for this widget.** Existing Supabase use elsewhere in the storefront is unchanged.

## Questions and answers

`data/assistant-faq.ts` contains French/Arabic questions and answers for product search, delivery, prices, contact details, stock, payment, order tracking, returns/warranties, product colors, equipment advice, and pickup/hours. Four popular questions appear immediately; “Autres questions” reveals the rest. Questions remain available after every answer.

Customers can select a question or type a topic. Simple local keyword matching chooses a prepared answer; it does not generate text or fetch private information. Unrecognized questions offer the existing catalogue search and the store's existing WhatsApp link for human help. Product names/references can be entered into that catalogue search. There are no invented product prices, stock counts, payment methods, delivery fees, opening hours or warranty periods.

Answers follow existing `data/information.ts` pages and the current footer contact links. Product prices and stock are checked on the real product page, and orders are checked through the existing account page. Update the prepared answers alongside store policies if those policies change.

The same GO ELEC styling, lazy-loaded chat panel, keyboard controls, mobile fit, Arabic RTL and exclusion from admin/auth/account/cart/checkout pages are preserved. Conversation history remains in component memory, bounded to forty messages, and disappears on refresh. Questions are not transmitted or saved to the database.

## AI removal

The former AI client, provider/catalogue handler and AI tests were removed. The earlier implementation remains recoverable in Git history if AI is explicitly requested later. The tracked `goelec-assistant/index.ts` is now a retirement response: HTTP `410 assistant_retired`, with no provider calls, environment-secret reads or database requests. Publishing it to the existing Edge Function retires the previous remote handler. The current widget never invokes that endpoint, independently of its deployment status. No AI secret needs to be added.

Remote retirement could not be completed during this change because the Supabase dashboard repeatedly timed out. The prior endpoint had no AI secret configured, and the replacement widget has no path to call it. Do not add a provider key; the prepared help does not need one.

Dokploy continues to deploy the existing app from `main`; its configuration is unchanged. No database migration or business-data edit is involved.

## Checks

FAQ tests verify both languages, all prepared answers/links, priority of specific questions, policy wording, fallback search encoding, and deterministic handling without provider dependencies. Browser checks cover question buttons, additional questions, typed topics, unknown questions, existing links, open/close/keyboard behavior, and mobile/RTL presentation. Run the repository's typecheck, lint, test suite, webpack production build and diff checks before pushing.
