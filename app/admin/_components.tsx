import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { SubmitButton } from "./_submit-button";

export function AdminHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="admin-page-actions">
        {children}
        {actionHref ? <Link className="admin-primary" href={actionHref}>{actionLabel}</Link> : null}
      </div>
    </header>
  );
}

export function PanelHeader({ title, description, count }: { title: string; description?: string; count?: number }) {
  return (
    <div className="admin-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {typeof count === "number" ? <span className="admin-count">{count}</span> : null}
    </div>
  );
}

export function EmptyState({ children, title = "Aucune donnée", actionHref, actionLabel }: { children: ReactNode; title?: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="admin-empty">
      <Inbox aria-hidden="true" size={24} />
      <strong>{title}</strong>
      <p>{children}</p>
      {actionHref && actionLabel ? <Link className="admin-secondary" href={actionHref}>{actionLabel}</Link> : null}
    </div>
  );
}

const positive = new Set(["active", "approved", "paid", "delivered", "disponible", "publié", "completed"]);
const warning = new Set(["pending", "processing", "authorized", "faible", "brouillon", "unfulfilled"]);
const danger = new Set(["archived", "rejected", "failed", "cancelled", "refunded", "rupture", "inactive"]);

export function Status({ children }: { children: ReactNode }) {
  const value = typeof children === "string" ? children.toLowerCase() : "";
  const tone = positive.has(value) ? "success" : warning.has(value) ? "warning" : danger.has(value) ? "danger" : "neutral";
  return <span className={`admin-status admin-status--${tone}`}>{children}</span>;
}

export { SubmitButton };
