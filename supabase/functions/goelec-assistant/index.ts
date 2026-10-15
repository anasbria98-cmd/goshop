import { createAssistantHandler } from "./core.mjs";

// Supabase Edge Runtime supplies Deno; no Node/Next server or browser secrets.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

Deno.serve(createAssistantHandler({ env: (name: string) => Deno.env.get(name) }));
