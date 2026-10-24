import 'server-only';
import { createSupabaseServerClient } from './supabase/server';
import { hasSupabaseEnv } from './env';
import { categoryNavigation, type CategoryNavigation } from './category-navigation';

export async function getCategoryNavigation():Promise<CategoryNavigation> {
  if(!hasSupabaseEnv()) return {top:[],all:[],mobile:[]};
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from('categories').select('*').eq('is_active',true).order('sort_order').order('name');
  if(error) throw new Error('Impossible de charger les catégories du menu.');
  return categoryNavigation(data??[]);
}
