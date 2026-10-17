import 'server-only';
import { information } from '@/data/information';
import { helpTopicAnswer, type HelpLocale } from '@/data/assistant-faq';
import { isAppareillage } from './product-variants';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from './env';
import type { AssistantProduct, AssistantSource } from './customer-assistant-model';

type RawProduct = {
  id:string; name:string; slug:string; sku:string; manufacturer_reference:string|null;
  price:number|string|null; short_description:string|null; color_variants_enabled?:boolean;
  brands:{name:string}|null; product_categories:{category_id:string}[];
  inventory:{variant_id:string|null;quantity:number;reserved_quantity:number}[];
  product_variants:{id:string;name:string;price:number|string|null;is_active:boolean;color_name?:string|null;color_hex?:string|null;image_path?:string|null}[];
};
const price = (value: number|string|null) => value == null || !Number.isFinite(Number(value)) ? null : Number(value);
export async function loadAssistantSource(locale: HelpLocale): Promise<AssistantSource> {
  const {url,key}=getPublicSupabaseEnv();
  // Always anonymous: staff sessions must never broaden assistant data access.
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{data:categoryRows,error:categoryError},{data:settings,error:settingsError}]=await Promise.all([
    db.from('categories').select('id,name,slug,parent_id').eq('is_active',true).order('sort_order').order('name'),
    db.from('store_settings').select('key,value').eq('is_public',true).in('key',['support_email','business_address']),
  ]);
  if(categoryError||settingsError) throw new Error('Catalogue temporairement indisponible');
  const byId=new Map((categoryRows??[]).map(c=>[c.id,c]));
  const categories=(categoryRows??[]).map(c=>{const parts=[c.slug];const visited=new Set([c.id]);let parent=byId.get(c.parent_id);while(parent&&!visited.has(parent.id)){visited.add(parent.id);parts.unshift(parent.slug);parent=byId.get(parent.parent_id);}return {id:c.id,name:c.name,path:parts.join('/')};});
  const products:AssistantProduct[]=[];
  // Page through published products instead of silently truncating at PostgREST's
  // row limit. No user, order or privileged key is involved.
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from('products').select(`id,name,slug,sku,manufacturer_reference,price,short_description,color_variants_enabled,brands(name),product_categories(category_id),inventory(variant_id,quantity,reserved_quantity),product_variants(id,name,price,is_active,color_name,color_hex,image_path)`)
      .eq('status','active').not('published_at','is',null).order('id').range(offset,offset+499);
    if(error)throw new Error('Catalogue temporairement indisponible');
    for(const p of (data??[]) as unknown as RawProduct[]){
      const categoryIds=p.product_categories.map(c=>c.category_id);
      const colors=p.product_variants.filter(v=>v.color_name&&v.color_hex&&v.image_path);
      const hasColors=isAppareillage(categoryIds,categoryRows??[])&&(p.color_variants_enabled||colors.length>0);
      const variants=(hasColors?colors:[]).filter(v=>v.is_active).map(v=>{
        const inventory=p.inventory.filter(i=>i.variant_id===v.id);
        return {name:v.name,price:price(v.price??p.price),stock:inventory.length?inventory.reduce((s,i)=>s+Math.max(0,i.quantity-i.reserved_quantity),0):null};
      });
      const baseInventory=p.inventory.filter(i=>i.variant_id==null);
      products.push({id:p.id,name:p.name,slug:p.slug,sku:p.sku,reference:p.manufacturer_reference,brand:p.brands?.name??'',price:hasColors&&!variants.length?null:price(p.price),description:p.short_description,
        stock:baseInventory.length?baseInventory.reduce((s,i)=>s+Math.max(0,i.quantity-i.reserved_quantity),0):null,
        categories:categories.filter(c=>categoryIds.includes(c.id)).map(c=>c.name),categoryIds,variants});
    }
    if(!data||data.length<500)break;
  }
  const setting=(key:string)=>{const value=settings?.find(s=>s.key===key)?.value;return typeof value==='string'&&value.trim()?value:undefined;};
  return {products,categories,policies:Object.fromEntries(Object.entries(information).map(([key,value])=>[key,value.body.join(' ')])),help:Object.fromEntries(['contact','returns','pickup','colors'].map(id=>[id,helpTopicAnswer(id,locale)])),email:setting('support_email'),address:setting('business_address')};
}
