import Link from "next/link";
import { AdminHeader, EmptyState, PanelHeader } from "../_components";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/catalog-model";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole();
  const { q } = await searchParams;
  const supabase = createSupabaseAdminClient();
  const [{ data: profiles }, { data: orders }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id,grand_total,created_at,status"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emails = new Map(authData.users.map((user) => [user.id, user.email || ""]));
  const search = q?.trim().toLowerCase();
  const rows = (profiles ?? []).filter((profile) => !search || [profile.first_name, profile.last_name, profile.phone, emails.get(profile.id)].some((value) => value?.toLowerCase().includes(search)));
  return (
    <>
      <AdminHeader title="Clients" description="Profils et activité commerciale, sans données d’authentification sensibles." />
      <form className="admin-filters"><label className="admin-search-field"><span>Rechercher</span><input name="q" defaultValue={q} placeholder="Nom, email ou téléphone" /></label><button>Rechercher</button></form>
      <section className="admin-panel admin-panel--flush"><PanelHeader title="Répertoire clients" count={rows.length} />{rows.length ? <div className="admin-table-wrap"><table><thead><tr><th>Client</th><th>Email</th><th>Téléphone</th><th>Commandes</th><th>Total dépensé</th><th>Dernière commande</th><th>Inscription</th></tr></thead><tbody>{rows.map((profile) => {
        const customerOrders = (orders ?? []).filter((order) => order.user_id === profile.id);
        const valid = customerOrders.filter((order) => !["cancelled", "refunded"].includes(order.status));
        return <tr key={profile.id}><td data-label="Client"><Link className="admin-table-link" href={`/admin/customers/${profile.id}`}>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Client"}</Link></td><td data-label="Email">{emails.get(profile.id) || "—"}</td><td data-label="Téléphone">{profile.phone || "—"}</td><td data-label="Commandes">{customerOrders.length}</td><td data-label="Total dépensé"><strong>{money(valid.reduce((sum, order) => sum + Number(order.grand_total), 0))}</strong></td><td data-label="Dernière commande">{customerOrders[0] ? new Date(customerOrders[0].created_at).toLocaleDateString("fr-MA") : "—"}</td><td data-label="Inscription">{new Date(profile.created_at).toLocaleDateString("fr-MA")}</td></tr>;
      })}</tbody></table></div> : <EmptyState title="Aucun client">Aucun client ne correspond à cette recherche.</EmptyState>}</section>
    </>
  );
}
