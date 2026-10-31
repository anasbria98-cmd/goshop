"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generalVariantError, generalVariantSchema } from "@/lib/general-variant-input";

import { variantImagePathSchema } from "@/lib/variant-image-path.mjs";

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

export async function saveGeneralVariantImage(_previous:Feedback,data:FormData):Promise<Feedback> {
  await requireRole();
  try {
    const productId=z.string().uuid().parse(data.get('product_id'));
    const id=z.string().uuid().parse(data.get('id'));
    const path=variantImagePathSchema.parse(data.get('image_path'));
    const supabase=await createSupabaseServerClient();
    const {error}=await supabase.rpc('set_product_variant_image',{p_product_id:productId,p_variant_id:id,p_image_path:path});
    if(error) return {error:'Impossible d’enregistrer l’image. Vérifiez le fichier puis réessayez.',success:null};
    revalidatePath(`/admin/products/${productId}`);revalidatePath('/', 'layout');
    return {error:null,success:'Image de la variante enregistrée.'};
  } catch(error) {unstable_rethrow(error);return {error:generalVariantError(error),success:null};}
}
