import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from './env';
import { createPublicPreviewCache } from './public-preview-cache';
import { socialProduct, type SocialProductRow } from './product-social-model';

// Public RLS-only projection: no cookies, service key, inventory, variants or private data.
// Short TTL observes admin edits/unpublishing within 30s; missing/error results are not cached.
const products = createPublicPreviewCache<ReturnType<typeof socialProduct>>(128, 30000);
class MissingSocialProduct extends Error {}
export async function getSocialProduct(slug: string) {
  try {
    return await products.get(slug, async () => {
      const {url,key} = getPublicSupabaseEnv();
      const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const {data,error} = await client.from('products')
        .select('id,updated_at,name,slug,sku,main_image_url,short_description,description,brands(name),product_images(storage_path,sort_order)')
        .eq('slug',slug).eq('status','active').not('published_at','is',null).limit(1).maybeSingle();
      if (error) throw new Error('social_catalog_unavailable');
      if (!data) throw new MissingSocialProduct();
      return socialProduct(data as unknown as SocialProductRow,url);
    });
  } catch (error) { if (error instanceof MissingSocialProduct) return null; throw error; }
}
