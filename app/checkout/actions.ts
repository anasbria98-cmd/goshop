"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sendOrderConfirmation } from "@/lib/send-order-confirmation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().email(), phone: z.string().min(8).max(30), first_name: z.string().min(2), last_name: z.string().min(2), address_line_1: z.string().min(5), address_line_2: z.string().optional(), city: z.string().min(2), region: z.string().optional(), postal_code: z.string().optional(), customer_note: z.string().max(1000).optional(), items: z.string().transform((value) => JSON.parse(value)).pipe(z.array(z.object({ product_id: z.string().uuid(), variant_id: z.string().uuid().nullable().optional(), quantity: z.number().int().positive().max(99) })).min(1).max(100)) });
export async function placeOrder(formData: FormData) {
  const values = schema.parse(Object.fromEntries(formData));
  const userClient = await createSupabaseServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  const address = { first_name: values.first_name, last_name: values.last_name, phone: values.phone, address_line_1: values.address_line_1, address_line_2: values.address_line_2 || null, city: values.city, region: values.region || null, postal_code: values.postal_code || null, country: "MA" };
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_order_from_cart", { p_user_id: user?.id ?? null, p_email: values.email, p_phone: values.phone, p_items: values.items, p_shipping_address: address, p_billing_address: address, p_customer_note: values.customer_note || null });
  if (error) throw new Error(error.message);
  await sendOrderConfirmation(data.id);
  redirect(`/commande-confirmee?numero=${encodeURIComponent(data.order_number)}`);
}
