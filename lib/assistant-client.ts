export type AssistantProduct = {
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  price: number | null;
  description: string;
  href: string;
};
export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantReply = { answer: string; products: AssistantProduct[] };

/** Render text, never model HTML/Markdown or unverified product destinations. */
export function parseAssistantReply(value: unknown): AssistantReply {
  if (!value || typeof value !== "object") throw new Error("invalid_response");
  const payload = value as Partial<AssistantReply>;
  if (typeof payload.answer !== "string" || !payload.answer.trim() || payload.answer.length > 2500 || !Array.isArray(payload.products) || payload.products.length > 5) throw new Error("invalid_response");
  const products = payload.products.map((product) => {
    if (!product || typeof product.id !== "string" || typeof product.name !== "string" || (product.brand !== null && typeof product.brand !== "string") || typeof product.sku !== "string" || typeof product.description !== "string" || (product.price !== null && (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0)) || typeof product.href !== "string" || !/^\/produit\/[a-zA-Z0-9_%\-]+$/.test(product.href)) throw new Error("invalid_response");
    if (!/^[\p{L}\p{N}_-]+$/u.test(decodeURIComponent(product.href.slice("/produit/".length)))) throw new Error("invalid_response");
    return product;
  });
  return { answer: payload.answer, products };
}

export async function requestAssistant(messages: AssistantMessage[], config: { url: string; key: string }, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<AssistantReply> {
  const response = await fetcher(`${config.url.replace(/\/$/, "")}/functions/v1/goelec-assistant`, {
    method: "POST", credentials: "omit", signal,
    headers: { "Content-Type": "application/json", apikey: config.key },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "rate_limited" : "assistant_unavailable");
  return parseAssistantReply(await response.json());
}
