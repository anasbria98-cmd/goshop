// Retired compatibility endpoint. The storefront help is entirely local now.
// No AI provider, credentials, catalogue queries or outbound requests.
declare const Deno: {
  serve(handler: () => Response): void;
};

Deno.serve(() => Response.json({ error: "assistant_retired" }, { status: 410, headers: { "Cache-Control": "no-store" } }));
