"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generalVariantError, generalVariantSchema } from "@/lib/general-variant-input";

type Feedback = {error:string|null;success:string|null};
export async function addGeneralVariant(_previous:Feedback, data:FormData):Promise<Feedback> {
  await requireRole();
  try {
    const productId=z.string().uuid().parse(data.get('product_id'));
    const input=generalVariantSchema.parse({...Object.fromEntries(data),is_active:data.get('is_active')==='on'});
    const supabase=await createSupabaseServerClient();
    const {error}=await supabase.rpc('add_product_general_variants',{p_product_id:productId,p_variants:[input]});
    if(error) return {error:generalVariantError(error),success:null};
    revalidatePath(`/admin/products/${productId}`);revalidatePath('/', 'layout');
    return {error:null,success:'Variante ajoutée et enregistrée avec succès.'};
  } catch(error) {unstable_rethrow(error);return {error:generalVariantError(error),success:null};}
}
export async function removeGeneralVariant(_previous:Feedback,data:FormData):Promise<Feedback> {
  await requireRole();
  try {
    const productId=z.string().uuid().parse(data.get('product_id'));
    const id=z.string().uuid().parse(data.get('id'));
    const supabase=await createSupabaseServerClient();
    const {error}=await supabase.rpc('delete_product_variant_safely',{p_product_id:productId,p_variant_id:id});
    if(error) return {error:generalVariantError(error),success:null};
    revalidatePath(`/admin/products/${productId}`);revalidatePath('/', 'layout');
    return {error:null,success:'Variante supprimée.'};
  } catch(error) {unstable_rethrow(error);return {error:generalVariantError(error),success:null};}
}
