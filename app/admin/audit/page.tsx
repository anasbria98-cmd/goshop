import { AdminHeader, EmptyState, PanelHeader, Status } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type AuditRow = { id: string; admin_user_id: string | null; action: string; entity_type: string; entity_id: string | null; new_data: unknown; old_data: unknown; created_at: string };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string }> }) {
  await requireRole(["admin", "super_admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: profiles }] = await Promise.all([
    supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id,first_name,last_name,role"),
  ]);
  const people = new Map((profiles ?? []).map((profile) => [profile.id, { name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Administrateur", role: profile.role }]));
  let rows = (data ?? []) as unknown as AuditRow[];
  const search = params.q?.trim().toLowerCase();
  if (search) rows = rows.filter((log) => [log.action, log.entity_type, log.entity_id, people.get(log.admin_user_id ?? "")?.name].some((value) => value?.toLowerCase().includes(search)));
  if (params.entity) rows = rows.filter((log) => log.entity_type === params.entity);
  const entities = [...new Set(((data ?? []) as unknown as AuditRow[]).map((log) => log.entity_type))].sort();
  return (
    <>
      <AdminHeader title="Journal d’audit" description="Historique immuable des opérations administratives importantes." />
      <form className="admin-filters"><label className="admin-search-field"><span>Rechercher</span><input name="q" defaultValue={params.q} placeholder="Action, ressource, administrateur" /></label><label><span>Ressource</span><select name="entity" defaultValue={params.entity}><option value="">Toutes</option>{entities.map((entity) => <option key={entity}>{entity}</option>)}</select></label><button>Appliquer</button></form>
      <section className="admin-panel admin-panel--flush"><PanelHeader title="Événements" count={rows.length} />{rows.length ? <div className="admin-table-wrap"><table><thead><tr><th>Date et heure</th><th>Administrateur</th><th>Action</th><th>Ressource</th><th>Identifiant</th><th>Détails</th></tr></thead><tbody>{rows.map((log) => {
        const actor = people.get(log.admin_user_id ?? "");
        return <tr key={log.id}><td data-label="Date et heure">{new Date(log.created_at).toLocaleString("fr-MA")}</td><td data-label="Administrateur"><strong>{actor?.name ?? "Système"}</strong><small>{actor?.role}</small></td><td data-label="Action"><Status>{log.action}</Status></td><td data-label="Ressource">{log.entity_type}</td><td data-label="Identifiant"><code>{log.entity_id || "—"}</code></td><td data-label="Détails"><details className="admin-audit-details"><summary>Afficher</summary><pre>{JSON.stringify({ avant: log.old_data, après: log.new_data }, null, 2)}</pre></details></td></tr>;
      })}</tbody></table></div> : <EmptyState title="Aucun événement">Aucune action ne correspond à ces critères.</EmptyState>}</section>
    </>
  );
}
