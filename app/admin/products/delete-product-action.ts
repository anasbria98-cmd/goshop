"use server";

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteProductState={error:string|null;deleted:boolean};
export async function permanentlyDeleteProduct(_previous:DeleteProductState,data:FormData):Promise<DeleteProductState> {
  await requireRole(['admin','super_admin']);
  try {
    if(data.get('confirmed')!=='on') return {error:'Confirmez explicitement la suppression définitive.',deleted:false};
    const id=z.string().uuid().parse(data.get('id'));
    const name=z.string().min(1).max(220).parse(data.get('name'));
    const sku=z.string().min(1).max(80).parse(data.get('sku'));
    const supabase=await createSupabaseServerClient();
    const {error}=await supabase.rpc('delete_product_safely',{p_product_id:id,p_name:name,p_sku:sku,p_confirmed:true});
    if(error) {
      const reasons:Record<string,string>={
        PRODUCT_ORDER_HISTORY:'Suppression impossible : ce produit est lié à des commandes. Archivez-le pour préserver leur historique.',
        PRODUCT_STOCK_HISTORY:'Suppression impossible : ce produit possède un historique de mouvements de stock. Vous pouvez l’archiver.',
        PRODUCT_RESERVED_STOCK:'Suppression impossible : du stock est réservé pour ce produit.',
        PRODUCT_SLIDER_REFERENCE:'Suppression impossible : une bannière utilise ce produit. Retirez d’abord ce lien depuis la gestion des sliders.',
        PRODUCT_SHARED_RELATION:'Suppression impossible : des données d’un autre produit référencent une variante de ce produit.',
        PRODUCT_DELETE_CHANGED:'Le nom ou le SKU a changé. Rechargez la liste et confirmez à nouveau.',
        PRODUCT_DELETE_NOT_FOUND:'Ce produit n’existe plus. Rechargez la liste.',
        PRODUCT_DELETE_FORBIDDEN:'Seuls les administrateurs autorisés peuvent supprimer définitivement un produit.',
      };
      return {error:reasons[error.message]??'Suppression impossible. Des données liées ou une erreur empêchent cette opération. Aucun changement n’a été effectué.',deleted:false};
    }
    revalidatePath('/admin/products');
    revalidatePath('/','layout');
    return {error:null,deleted:true};
  } catch(error) {
    unstable_rethrow(error);
    return {error:'Suppression impossible. Vérifiez le produit et réessayez.',deleted:false};
  }
}
