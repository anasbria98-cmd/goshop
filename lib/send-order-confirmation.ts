import 'server-only';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { deliverOrderConfirmation } from '@/lib/order-confirmation';

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  await deliverOrderConfirmation({
    key: process.env.RESEND_API_KEY,
    log: code => console.error('[GO ELEC order confirmation]',code),
    load: async () => {
      const admin = createSupabaseAdminClient();
      const [{data:order,error:orderError},{data:items,error:itemsError}] = await Promise.all([
        admin.from('orders').select('id,order_number,created_at,email,phone,currency,grand_total,shipping_address_snapshot').eq('id',orderId).single(),
        admin.from('order_items').select('product_name,variant_name,quantity,unit_price,line_total').eq('order_id',orderId).order('created_at').order('id'),
      ]);
      if (orderError || itemsError || !order || !items) throw new Error('Saved order unavailable');
      return {order,items:z.array(z.object({product_name:z.string(),variant_name:z.string().nullable(),quantity:z.number().int().positive(),unit_price:z.coerce.number().nonnegative(),line_total:z.coerce.number().nonnegative()})).parse(items)};
    },
  });
}
