"use server";

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getProducts } from '@/lib/catalog';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recentProductIds } from '@/lib/product-page-model';

export async function loadRecentProducts(ids: string[]) {
  const valid = recentProductIds(ids);
  const products = await getProducts({ ids: valid });
  return valid.flatMap((id) => products.filter((p) => p.id === id)).slice(0, 8);
}

export async function submitProductReview(_previous: { message: string; success?: boolean }, form: FormData) {
  const parsed = z.object({ productId: z.uuid(), rating: z.coerce.number().int().min(1).max(5), content: z.string().trim().min(3).max(3000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Choisissez une note et écrivez un commentaire de 3 à 3000 caractères.' };
  try {
    const db = await createSupabaseServerClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return { message: 'Connectez-vous pour laisser un commentaire.' };
    const { data: product } = await db.from('products').select('id,slug').eq('id', parsed.data.productId).eq('status', 'active').not('published_at', 'is', null).maybeSingle();
    if (!product) return { message: 'Ce produit n’est plus disponible.' };
    const { error } = await db.from('reviews').insert({ product_id: product.id, user_id: user.id, rating: parsed.data.rating, content: parsed.data.content, status: 'pending', verified_purchase: false });
    if (error) return { message: error.code === '23505' ? 'Vous avez déjà envoyé un avis pour ce produit.' : 'Impossible d’envoyer votre avis. Réessayez.' };
    revalidatePath(`/produit/${product.slug}`);
    return { message: 'Merci ! Votre commentaire sera publié après validation.', success: true };
  } catch (error) { unstable_rethrow(error); return { message: 'Le service est temporairement indisponible. Réessayez.' }; }
}
