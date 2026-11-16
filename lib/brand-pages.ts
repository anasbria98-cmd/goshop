import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from './supabase/server';
import { getCategories, getProducts } from './catalog';
import { brandLandingPath, type LandingBrand } from './brand-page-model';

// Request-only deduplication between metadata and page; prices/stock are never cached across requests.
export const getBrandPage = cache(async (slug: string) => {
  if (!brandLandingPath(slug)) return null;
  const client = await createSupabaseServerClient();
  const [result, categories] = await Promise.all([
    client.from('brands').select('id,name,slug,description,seo_title,seo_description,logo_url').eq('slug', slug).eq('is_active', true).maybeSingle(),
    getCategories(),
  ]);
  if (result.error) throw new Error('Impossible de charger la marque.');
  if (!result.data) return null;
  const brand: LandingBrand = result.data;
  const products = await getProducts({ brandId: brand.id }, categories);
  if (!products.length) return null;
  return { brand, products, categories };
});
