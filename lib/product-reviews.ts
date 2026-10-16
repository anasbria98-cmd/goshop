import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ProductReview = { id: string; name: string; rating: number; content: string | null; date: string };
export async function getProductReviews(productId: string) {
  const db = await createSupabaseServerClient();
  // Explicit approval filter also applies when a staff member views the storefront.
  const { data, error } = await db.from('reviews').select('id,user_id,rating,content,created_at').eq('product_id', productId).eq('status', 'approved').order('created_at', { ascending: false }).limit(100);
  if (error) return { reviews: [] as ProductReview[], unavailable: true };
  let names = new Map<string, string>();
  if (data?.length) {
    // Profiles are private under RLS. Read only public display names server-side;
    // never serialize profile records, email addresses or user IDs to visitors.
    try {
    const { data: profiles } = await createSupabaseAdminClient().from('profiles').select('id,first_name,last_name').in('id', [...new Set(data.map((r) => r.user_id))]);
    names = new Map((profiles ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Client GO ELEC']));
    } catch { /* A display-name lookup must not prevent reading published reviews. */ }
  }
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user ? await db.from('profiles').select('first_name,last_name').eq('id', user.id).maybeSingle() : { data: null };
  return { reviews: (data ?? []).map((r) => ({ id: r.id, name: names.get(r.user_id) || 'Client GO ELEC', rating: r.rating, content: r.content, date: r.created_at })), unavailable: false,
    customerName: user ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Client GO ELEC' : null };
}
