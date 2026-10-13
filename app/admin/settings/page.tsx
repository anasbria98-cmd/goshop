import { Settings, Mail, ShoppingBag, Truck, CreditCard, Search, Share2, Plus } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveSetting } from "../actions";

const sections = [
  ["general", "Général", Settings],
  ["contact", "Contact", Mail],
  ["orders", "Commandes", ShoppingBag],
  ["shipping", "Livraison", Truck],
  ["payments", "Paiements", CreditCard],
  ["seo", "SEO", Search],
  ["social", "Réseaux sociaux", Share2],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const params = await searchParams;
  const active = sections.some(([key]) => key === params.section) ? params.section! : "general";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_settings").select("*").order("key");
  const rows = (data ?? []).filter((setting) => setting.group_name === active);
  const activeLabel = sections.find(([key]) => key === active)?.[1] ?? "Général";
  return (
    <>
      <AdminHeader title="Paramètres" description="Configuration centralisée de la boutique par domaine." />
      <nav className="admin-settings-tabs" aria-label="Sections des paramètres">{sections.map(([key, label, Icon]) => <a className={key === active ? "is-active" : undefined} href={`?section=${key}`} aria-current={key === active ? "page" : undefined} key={key}><Icon size={16} aria-hidden="true" />{label}</a>)}</nav>
      <div className="admin-settings-layout"><section className="admin-panel admin-settings-values"><PanelHeader title={activeLabel} description={`${rows.length} paramètre(s) dans cette section`} />{rows.length ? <div className="admin-settings-list">{rows.map((setting) => <form action={saveSetting} className="admin-setting" key={setting.key}><input type="hidden" name="key" value={setting.key} /><input type="hidden" name="group_name" value={setting.group_name} /><div className="admin-setting-copy"><strong>{setting.description || setting.key}</strong><code>{setting.key}</code></div><label>Valeur<textarea name="value" rows={3} defaultValue={typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value)} /></label><label className="admin-checkbox"><input type="checkbox" name="is_public" defaultChecked={setting.is_public} /> Paramètre public</label><SubmitButton className="admin-secondary">Enregistrer</SubmitButton></form>)}</div> : <EmptyState title="Aucun paramètre">Cette section ne contient encore aucun paramètre.</EmptyState>}</section>
      <aside className="admin-panel admin-settings-create"><div className="admin-settings-icon"><Plus size={22} /></div><PanelHeader title="Nouveau paramètre" description="Ajoutez une configuration à cette section." /><form action={saveSetting} className="admin-form-grid"><input type="hidden" name="group_name" value={active} /><label><span>Clé <span className="required-mark">*</span></span><input name="key" required pattern="[a-z0-9_]+" placeholder="nom_du_parametre" /></label><label>Valeur<input name="value" /></label><label className="admin-form-wide">Description<input name="description" /></label><label className="admin-checkbox"><input type="checkbox" name="is_public" /> Paramètre public</label><SubmitButton>Ajouter le paramètre</SubmitButton></form></aside></div>
    </>
  );
}
