"use client";

import { StoreText } from "./storefront-language";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function AuthSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button orange" type="submit" disabled={pending} aria-busy={pending}>
    {pending && <LoaderCircle size={18} className="navigation-spinner" aria-hidden="true" />}
    <span aria-live="polite"><StoreText>{pending ? "Connexion en cours…" : "Se connecter"}</StoreText></span>
  </button>;
}
