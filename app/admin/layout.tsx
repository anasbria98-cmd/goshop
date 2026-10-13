import { getCurrentUser, requireRole } from "@/lib/auth";
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { AdminShell } from "./_admin-shell";
export const dynamic = "force-dynamic";

async function AuthorizedAdmin({ children }: { children: React.ReactNode }) {
  const [profile, user] = await Promise.all([requireRole(), getCurrentUser()]);
  const adminName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Administrateur";

  return <AdminShell adminName={adminName} email={user?.email ?? ""} role={profile.role}>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="admin-entry-loading" role="status"><LoaderCircle className="navigation-spinner" size={24} aria-hidden="true" /><p>Ouverture de votre espace d’administration…</p></div>}><AuthorizedAdmin>{children}</AuthorizedAdmin></Suspense>;
}
