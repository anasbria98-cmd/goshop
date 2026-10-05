"use client";
import { useEffect, useRef } from "react";
import { products } from "@/data/catalog";
import { useStore } from "./store-provider";
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function WebMCP() {
  const { cart, total } = useStore();
  const state = useRef({ cart, total });
  useEffect(() => {
    state.current = { cart, total };
  }, [cart, total]);
  useEffect(() => {
    const ctx = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: "read_go_elec_cart",
            description:
              "Read the current device-local GO ELEC demo cart and product total in MAD. Does not place an order.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object");
              return {
                currency: "MAD",
                total: state.current.total,
                items: products
                  .filter((p) => state.current.cart[p.id])
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    quantity: state.current.cart[p.id],
                    unitPrice: p.price,
                  })),
                demo: true,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return null;
}
