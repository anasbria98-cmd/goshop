import { AdminHeader, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { updateAdministratorRole } from "../actions";

export default async function AdministratorsPage() {
  const current = await requireRole(["super_admin"]);
  const supabase = createSupabaseAdminClient();
  const [{ data: profiles }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").in("role", ["staff", "admin", "super_admin"]).order("created_at"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emails = new Map(authData.users.map((user) => [user.id, user.email || ""]));
  return (
    <>
      <AdminHeader title="Administrateurs" description="Gérez les accès internes selon les rôles existants." />
      <div className="admin-security-note"><strong>Sécurité des rôles</strong><span>Seul un super administrateur peut modifier les rôles. Votre propre rôle super administrateur reste protégé côté serveur.</span></div>
      <section className="admin-panel admin-panel--flush"><PanelHeader title="Équipe administrative" count={profiles?.length ?? 0} /><div className="admin-table-wrap"><table><thead><tr><th>Administrateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th>Modifier le rôle</th></tr></thead><tbody>{profiles?.map((profile) => <tr key={profile.id}><td data-label="Administrateur"><strong>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Administrateur"}</strong>{profile.id === current.id ? <small>Votre compte</small> : null}</td><td data-label="Email">{emails.get(profile.id) || "—"}</td><td data-label="Rôle"><Status>{profile.role}</Status></td><td data-label="Statut"><Status>Active</Status></td><td data-label="Créé le">{new Date(profile.created_at).toLocaleDateString("fr-MA")}</td><td data-label="Modifier le rôle"><form action={updateAdministratorRole} className="inline-adjust"><input type="hidden" name="id" value={profile.id} /><select name="role" defaultValue={profile.role} aria-label={`Rôle de ${emails.get(profile.id) || profile.id}`}>{["customer", "staff", "admin", "super_admin"].map((role) => <option key={role}>{role}</option>)}</select><SubmitButton className="admin-secondary">Enregistrer</SubmitButton></form></td></tr>)}</tbody></table></div></section>
    </>
  );
}
