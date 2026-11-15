import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { CatalogCategory } from './catalog-model';
import { getPublicSupabaseEnv } from './env';
import { socialProduct, type SocialProductRow } from './product-social-model';
import { DEFAULT_PRODUCT_SHARE_IMAGE, productShareImage, productSocialPreviewUrl } from './product-sharing';
import { productShareImageChecker } from './product-sharing-server';

/** Public RLS, category membership only; never load the full catalogue or commercial relations. */
export async function getCategorySharingImage(path: string, categories: CatalogCategory[]) {
  const ids = categories.filter(category => category.path === path || category.path.startsWith(`${path}/`)).map(category => category.id);
  if (!categories.some(category => category.path === path)) return { url: DEFAULT_PRODUCT_SHARE_IMAGE, alt: 'GO ELEC' };
  const { url, key } = getPublicSupabaseEnv();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const batchSize = 20;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await client.from('products')
      .select('id,name,slug,main_image_url,product_images(storage_path,sort_order),category_match:product_categories!inner(category_id)')
      .eq('status', 'active').not('published_at', 'is', null).lte('published_at', new Date().toISOString())
      .in('category_match.category_id', ids)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + batchSize - 1);
    // Social enrichment must not turn an otherwise working category into an HTTP 500.
    if (error) return { url: DEFAULT_PRODUCT_SHARE_IMAGE, alt: 'GO ELEC' };
    for (const row of data ?? []) {
      const product = socialProduct({ ...row, product_images: [...row.product_images].sort((a, b) => a.sort_order - b.sort_order || a.storage_path.localeCompare(b.storage_path)), sku: '', short_description: null, description: null, brands: null } as SocialProductRow, url);
      const source = await productShareImage(product, productShareImageChecker());
      if (source !== DEFAULT_PRODUCT_SHARE_IMAGE) return { url: productSocialPreviewUrl(product.slug, source), alt: product.name, type: 'image/jpeg', width: 1200, height: 630 };
    }
    if ((data?.length ?? 0) < batchSize) return { url: DEFAULT_PRODUCT_SHARE_IMAGE, alt: 'GO ELEC' };
  }
}
