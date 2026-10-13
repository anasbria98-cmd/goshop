"use client";
import { StoreText } from "@/components/storefront-language";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

export function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return <span className="navigation-feedback" role="status">
    {pending && <><LoaderCircle size={16} className="navigation-spinner" aria-hidden="true" /><span className="navigation-sr-only"><StoreText>Chargement en cours…</StoreText></span></>}
  </span>;
}
