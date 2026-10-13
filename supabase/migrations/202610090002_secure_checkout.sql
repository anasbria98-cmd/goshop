begin;

create or replace function public.create_order_from_cart(
  p_user_id uuid,
  p_email text,
  p_phone text,
  p_items jsonb,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_customer_note text default null
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_order public.orders;
  item jsonb;
  selected_product public.products;
  selected_inventory public.inventory;
  requested_quantity integer;
  line_subtotal numeric(12,2);
  calculated_subtotal numeric(12,2) := 0;
  calculated_tax numeric(12,2) := 0;
begin
  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Le panier est vide';
  end if;
  if nullif(trim(p_email), '') is null or nullif(trim(p_phone), '') is null then
    raise exception 'Email et téléphone requis';
  end if;

  -- Lock every inventory row in a deterministic order before calculating totals.
  perform 1 from public.inventory i
    where i.product_id in (select (value->>'product_id')::uuid from jsonb_array_elements(p_items))
      and i.variant_id is null
    order by i.product_id
    for update;

  for item in select value from jsonb_array_elements(p_items) loop
    requested_quantity := (item->>'quantity')::integer;
    if requested_quantity <= 0 then raise exception 'Quantité invalide'; end if;
    select * into selected_product from public.products
      where id = (item->>'product_id')::uuid and status = 'active' and published_at is not null and published_at <= now();
    if not found then raise exception 'Produit indisponible'; end if;
    select * into selected_inventory from public.inventory
      where product_id = selected_product.id and variant_id is null;
    if selected_product.stock_tracking and not selected_product.allow_backorder
      and (selected_inventory.id is null or selected_inventory.quantity - selected_inventory.reserved_quantity < requested_quantity)
    then raise exception 'Stock insuffisant pour %', selected_product.name; end if;
    line_subtotal := selected_product.price * requested_quantity;
    calculated_subtotal := calculated_subtotal + line_subtotal;
    calculated_tax := calculated_tax + round(line_subtotal - (line_subtotal / (1 + selected_product.tax_rate / 100)), 2);
  end loop;

  insert into public.orders(user_id,email,phone,status,payment_status,fulfillment_status,currency,subtotal,discount_total,shipping_total,tax_total,grand_total,customer_note,shipping_address_snapshot,billing_address_snapshot)
  values(p_user_id,p_email,p_phone,'pending','pending','unfulfilled','MAD',calculated_subtotal,0,0,calculated_tax,calculated_subtotal,p_customer_note,p_shipping_address,p_billing_address)
  returning * into created_order;

  for item in select value from jsonb_array_elements(p_items) loop
    requested_quantity := (item->>'quantity')::integer;
    select * into selected_product from public.products where id = (item->>'product_id')::uuid;
    insert into public.order_items(order_id,product_id,sku,product_name,quantity,unit_price,discount_amount,tax_amount,line_total,product_snapshot)
    values(created_order.id,selected_product.id,selected_product.sku,selected_product.name,requested_quantity,selected_product.price,0,round((selected_product.price * requested_quantity) - ((selected_product.price * requested_quantity) / (1 + selected_product.tax_rate / 100)), 2),selected_product.price * requested_quantity,
      jsonb_build_object(
        'id', selected_product.id,
        'name', selected_product.name,
        'slug', selected_product.slug,
        'sku', selected_product.sku,
        'manufacturer_reference', selected_product.manufacturer_reference,
        'brand_id', selected_product.brand_id,
        'main_image_url', selected_product.main_image_url,
        'unit_price', selected_product.price,
        'tax_rate', selected_product.tax_rate
      )
    );
    if selected_product.stock_tracking then
      update public.inventory set reserved_quantity = reserved_quantity + requested_quantity, updated_at = now()
        where product_id = selected_product.id and variant_id is null;
    end if;
  end loop;
  return created_order;
end;
$$;

revoke all on function public.create_order_from_cart(uuid,text,text,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_order_from_cart(uuid,text,text,jsonb,jsonb,jsonb,text) to service_role;

commit;
