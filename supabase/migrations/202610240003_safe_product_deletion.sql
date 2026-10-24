begin;
-- Staff keep normal catalogue editing; permanent deletion is only exposed by the guarded admin RPC.
drop policy products_staff_manage on public.products;
create policy products_staff_insert on public.products for insert with check (public.is_staff());
create policy products_staff_update on public.products for update using (public.is_staff()) with check (public.is_staff());

create function public.guard_product_history_on_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.order_items i where i.product_id=old.id or i.sku=old.sku
    or i.variant_id in(select id from public.product_variants where product_id=old.id)
    or i.sku in(select sku from public.product_variants where product_id=old.id)) then
    raise exception 'PRODUCT_ORDER_HISTORY';
  end if;
  if exists(select 1 from public.inventory_movements where product_id=old.id
    or variant_id in(select id from public.product_variants where product_id=old.id)) then
    raise exception 'PRODUCT_STOCK_HISTORY';
  end if;
  if exists(select 1 from public.inventory where product_id=old.id and reserved_quantity>0) then
    raise exception 'PRODUCT_RESERVED_STOCK';
  end if;
  if exists(select 1 from public.homepage_slides where product_id=old.id) then
    raise exception 'PRODUCT_SLIDER_REFERENCE';
  end if;
  if exists(select 1 from public.inventory where product_id<>old.id and variant_id in(select id from public.product_variants where product_id=old.id))
    or exists(select 1 from public.cart_items where product_id<>old.id and variant_id in(select id from public.product_variants where product_id=old.id)) then
    raise exception 'PRODUCT_SHARED_RELATION';
  end if;
  return old;
end;
$$;
create trigger products_protect_history before delete on public.products
for each row execute function public.guard_product_history_on_delete();
revoke all on function public.guard_product_history_on_delete() from public,anon,authenticated;

create function public.delete_product_safely(p_product_id uuid,p_name text,p_sku text,p_confirmed boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.products;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'PRODUCT_DELETE_FORBIDDEN'; end if;
  if p_confirmed is distinct from true then raise exception 'PRODUCT_DELETE_CONFIRMATION'; end if;
  select * into target from public.products where id=p_product_id for update;
  if not found then raise exception 'PRODUCT_DELETE_NOT_FOUND'; end if;
  if target.name is distinct from p_name or target.sku is distinct from p_sku then raise exception 'PRODUCT_DELETE_CHANGED'; end if;
  -- Serialize against order/variant/inventory writes before checking dependencies.
  perform id from public.product_variants where product_id=target.id for update;
  perform id from public.inventory where product_id=target.id for update;
  -- Existing FKs cascade only product-owned rows. The trigger blocks historical/set-null references.
  delete from public.products where id=target.id;
  return target.id;
end;
$$;
revoke all on function public.delete_product_safely(uuid,text,text,boolean) from public,anon;
grant execute on function public.delete_product_safely(uuid,text,text,boolean) to authenticated;
commit;
