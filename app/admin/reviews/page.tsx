import { AdminHeader, EmptyState, PanelHeader, Status, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { moderateReview } from "../actions";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("reviews").select("id,rating,title,content,status,verified_purchase,created_at,products(name,slug),profiles(first_name,last_name)").order("created_at", { ascending: false });
  if (["pending", "approved", "rejected"].includes(status ?? "")) query = query.eq("status", status as never);
  const { data } = await query;
  return (
    <>
      <AdminHeader title="Avis" description="Examinez et modérez les avis clients avant publication." />
      <form className="admin-filters"><label><span>Statut</span><select name="status" defaultValue={status}><option value="">Tous les avis</option><option value="pending">En attente</option><option value="approved">Approuvés</option><option value="rejected">Rejetés</option></select></label><button>Appliquer</button></form>
      <section className="admin-panel admin-panel--flush"><PanelHeader title="Avis clients" count={data?.length ?? 0} />{data?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Produit</th><th>Client</th><th>Note</th><th>Commentaire</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead><tbody>{data.map((review) => {
        const product = review.products as unknown as { name: string; slug: string } | null;
        const profile = review.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
        return <tr key={review.id}><td data-label="Produit"><strong>{product?.name ?? "Produit supprimé"}</strong>{review.verified_purchase ? <small>Achat vérifié</small> : null}</td><td data-label="Client">{[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Client"}</td><td data-label="Note"><span className="admin-rating" aria-label={`${review.rating} sur 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></td><td data-label="Commentaire"><strong>{review.title || "Sans titre"}</strong><small className="admin-review-preview">{review.content || "Sans commentaire"}</small></td><td data-label="Statut"><Status>{review.status}</Status></td><td data-label="Date">{new Date(review.created_at).toLocaleDateString("fr-MA")}</td><td data-label="Actions"><div className="admin-row-actions">{product?.slug ? <a href={`/produit/${product.slug}`}>Voir</a> : null}<form action={moderateReview}><input type="hidden" name="id" value={review.id} /><input type="hidden" name="status" value="approved" /><SubmitButton className="admin-link-button">Approuver</SubmitButton></form><form action={moderateReview}><input type="hidden" name="id" value={review.id} /><input type="hidden" name="status" value="rejected" /><SubmitButton className="admin-link-button admin-danger-link">Rejeter</SubmitButton></form></div></td></tr>;
      })}</tbody></table></div> : <EmptyState title="Aucun avis">Aucun avis ne correspond à ce statut.</EmptyState>}</section>
    </>
  );
}
