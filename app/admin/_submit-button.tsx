"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function SubmitButton({ children = "Enregistrer", className = "admin-primary" }: { children?: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? <LoaderCircle className="admin-spinner" aria-hidden="true" size={16} /> : null}
      {pending ? "Enregistrement…" : children}
    </button>
  );
}
