begin;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_admin_note text default null
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  updated_order public.orders;
  item public.order_items;
  stock public.inventory;
  allowed boolean := false;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if current_order.status = p_status then
    update public.orders set admin_note = p_admin_note where id = p_order_id returning * into updated_order;
    return updated_order;
  end if;

  allowed := case current_order.status
    when 'pending' then p_status in ('confirmed','cancelled')
    when 'confirmed' then p_status in ('processing','cancelled')
    when 'processing' then p_status in ('shipped','cancelled')
    when 'shipped' then p_status in ('delivered','cancelled','refunded')
    when 'delivered' then p_status = 'refunded'
    else false
  end;
  if not allowed then raise exception 'Invalid order status transition: % to %', current_order.status, p_status; end if;

  if p_status = 'shipped' and current_order.fulfillment_status = 'unfulfilled' then
    for item in select * from public.order_items where order_id = p_order_id and product_id is not null loop
      select * into stock from public.inventory
        where product_id = item.product_id and variant_id is not distinct from item.variant_id for update;
      if stock.id is null then raise exception 'Inventory missing for order item %', item.id; end if;
      update public.inventory
        set quantity = quantity - item.quantity,
            reserved_quantity = greatest(0, reserved_quantity - item.quantity),
            updated_at = now()
        where id = stock.id;
      insert into public.inventory_movements(product_id,variant_id,type,quantity_change,previous_quantity,new_quantity,reason,reference,created_by)
      values(item.product_id,item.variant_id,'sale',-item.quantity,stock.quantity,stock.quantity-item.quantity,'Order shipped',current_order.order_number,auth.uid());
    end loop;
  elsif p_status = 'cancelled' and current_order.fulfillment_status = 'unfulfilled' then
    for item in select * from public.order_items where order_id = p_order_id and product_id is not null loop
      update public.inventory
        set reserved_quantity = greatest(0, reserved_quantity - item.quantity), updated_at = now()
        where product_id = item.product_id and variant_id is not distinct from item.variant_id;
    end loop;
  elsif p_status in ('cancelled','refunded') and current_order.fulfillment_status = 'fulfilled' then
    for item in select * from public.order_items where order_id = p_order_id and product_id is not null loop
      select * into stock from public.inventory
        where product_id = item.product_id and variant_id is not distinct from item.variant_id for update;
      if stock.id is not null then
        update public.inventory set quantity = quantity + item.quantity, updated_at = now() where id = stock.id;
        insert into public.inventory_movements(product_id,variant_id,type,quantity_change,previous_quantity,new_quantity,reason,reference,created_by)
        values(item.product_id,item.variant_id,case when p_status = 'refunded' then 'return'::public.inventory_movement_type else 'cancellation'::public.inventory_movement_type end,item.quantity,stock.quantity,stock.quantity+item.quantity,'Order reversed',current_order.order_number,auth.uid());
      end if;
    end loop;
  end if;

  update public.orders
  set status = p_status,
      admin_note = p_admin_note,
      fulfillment_status = case
        when p_status in ('shipped','delivered') then 'fulfilled'::public.fulfillment_status
        when p_status = 'cancelled' then 'cancelled'::public.fulfillment_status
        when p_status = 'refunded' then 'returned'::public.fulfillment_status
        else fulfillment_status
      end
  where id = p_order_id
  returning * into updated_order;
  return updated_order;
end;
$$;

revoke all on function public.admin_update_order_status(uuid,public.order_status,text) from public, anon;
grant execute on function public.admin_update_order_status(uuid,public.order_status,text) to authenticated;

commit;
