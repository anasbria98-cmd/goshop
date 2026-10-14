begin;

-- Nullable metadata leaves all existing variants, prices and inventory untouched.
alter table public.product_variants
  add column color_name text,
  add column color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  add column finish text,
  add column image_path text;
-- Public visibility of disabled colors remains governed by the existing RLS.
-- This flag prevents a product with all colors disabled falling back to its base SKU.
alter table public.products add column color_variants_enabled boolean not null default false;

create function public.categories_include_appareillage(p_ids uuid[])
returns boolean language sql stable security invoker set search_path = '' as $$
  with recursive ancestors as (
    select id, parent_id, slug from public.categories where id = any(p_ids)
    union
    select c.id, c.parent_id, c.slug from public.categories c join ancestors a on c.id = a.parent_id
  ) select exists(select 1 from ancestors where slug = 'appareillage');
$$;

create function public.save_product_color_variants(p_product_id uuid, p_variants jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  saved_variant_id uuid;
  current_stock public.inventory;
  requested_stock integer;
  changed_stock boolean;
begin
  if not public.is_staff() then raise exception 'Accès non autorisé'; end if;
  perform 1 from public.products where id = p_product_id for update;
  if not found then raise exception 'Produit introuvable'; end if;
  if not public.categories_include_appareillage(array(select category_id from public.product_categories where product_id = p_product_id)) then
    raise exception 'Les couleurs sont réservées aux produits Appareillage';
  end if;
  if jsonb_typeof(p_variants) is distinct from 'array' then raise exception 'Variantes invalides'; end if;
  perform 1 from public.inventory where product_id = p_product_id and variant_id is not null order by variant_id for update;
  for item in select value from jsonb_array_elements(p_variants) loop
    if nullif(trim(item->>'color_name'), '') is null
      or coalesce(item->>'color_hex', '') !~ '^#[0-9a-fA-F]{6}$'
      or nullif(trim(item->>'sku'), '') is null
      or nullif(trim(item->>'name'), '') is null
      or coalesce(item->>'image_path', '') !~ '^variants/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp)$'
      or jsonb_typeof(item->'is_active') is distinct from 'boolean'
      or (item->>'price')::numeric < 0 then raise exception 'Couleur, image, SKU ou prix invalide'; end if;
    if not exists(select 1 from storage.objects where bucket_id = 'product-images' and name = item->>'image_path') then
      raise exception 'L’image de cette couleur est introuvable';
    end if;
    saved_variant_id := nullif(item->>'id', '')::uuid;
    if saved_variant_id is not null then
      perform 1 from public.product_variants where id = saved_variant_id and product_id = p_product_id for update;
      if not found then raise exception 'Cette variante n’appartient pas au produit'; end if;
      update public.product_variants set name = trim(item->>'name'), sku = trim(item->>'sku'),
        barcode = nullif(trim(item->>'barcode'), ''), price = (item->>'price')::numeric,
        compare_at_price = case when item ? 'compare_at_price' then (item->>'compare_at_price')::numeric else compare_at_price end,
        color_name = trim(item->>'color_name'), color_hex = item->>'color_hex',
        finish = nullif(trim(item->>'finish'), ''), image_path = item->>'image_path',
        is_active = (item->>'is_active')::boolean where id = saved_variant_id;
    else
      insert into public.product_variants(product_id,name,sku,barcode,price,compare_at_price,is_active,color_name,color_hex,finish,image_path)
      values(p_product_id,trim(item->>'name'),trim(item->>'sku'),nullif(trim(item->>'barcode'), ''),
        (item->>'price')::numeric,(item->>'compare_at_price')::numeric,(item->>'is_active')::boolean,trim(item->>'color_name'),item->>'color_hex',
        nullif(trim(item->>'finish'), ''),item->>'image_path') returning id into saved_variant_id;
    end if;
    select * into current_stock from public.inventory where product_id = p_product_id and inventory.variant_id = saved_variant_id;
    changed_stock := item->>'stock' is not null;
    if changed_stock and coalesce(item->>'stock', '') !~ '^[0-9]+$' then raise exception 'Stock invalide'; end if;
    requested_stock := coalesce((item->>'stock')::integer, current_stock.quantity, 0);
    if changed_stock and requested_stock < coalesce(current_stock.reserved_quantity, 0) then raise exception 'Le stock ne peut pas être inférieur aux quantités réservées'; end if;
    if current_stock.id is null then
      insert into public.inventory(product_id,variant_id,quantity) values(p_product_id,saved_variant_id,requested_stock);
      if requested_stock <> 0 then
        insert into public.inventory_movements(product_id,variant_id,type,quantity_change,previous_quantity,new_quantity,reason,created_by)
        values(p_product_id,saved_variant_id,'manual_adjustment',requested_stock,0,requested_stock,'Stock initial de la couleur',auth.uid());
      end if;
    elsif changed_stock then
      if (item->>'expected_stock')::integer is distinct from current_stock.quantity then raise exception 'Le stock a changé. Rechargez la fiche avant de l’ajuster.'; end if;
      if requested_stock <> current_stock.quantity then
        perform public.adjust_inventory(current_stock.id,requested_stock - current_stock.quantity,'manual_adjustment','Modification du stock de la couleur',null);
      end if;
    end if;
  end loop;
  if jsonb_array_length(p_variants) > 0 then update public.products set color_variants_enabled = true where id = p_product_id; end if;
end;
$$;

-- The color workflow saves product + assignments + variant stocks in one transaction.
-- Its product fields match the existing saveProduct action; omitted fields stay untouched.
create function public.save_product_with_color_variants(
  p_product_id uuid, p_product jsonb, p_category_ids uuid[], p_primary_category_id uuid,
  p_stock integer, p_low_stock_threshold integer, p_variants jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  saved_id uuid;
  input public.products;
begin
  if not public.is_staff() then raise exception 'Accès non autorisé'; end if;
  if not public.categories_include_appareillage(p_category_ids) then raise exception 'Les couleurs sont réservées aux produits Appareillage'; end if;
  input := jsonb_populate_record(null::public.products, p_product);
  if p_product_id is null then
    insert into public.products(name,slug,sku,manufacturer_reference,barcode,brand_id,short_description,description,price,compare_at_price,cost_price,tax_rate,main_image_url,status,published_at,stock_tracking,allow_backorder,featured,is_new,is_best_seller,is_on_sale,seo_title,seo_description)
    values(input.name,input.slug,input.sku,input.manufacturer_reference,input.barcode,input.brand_id,input.short_description,input.description,input.price,input.compare_at_price,input.cost_price,input.tax_rate,input.main_image_url,input.status,input.published_at,input.stock_tracking,input.allow_backorder,input.featured,input.is_new,input.is_best_seller,input.is_on_sale,input.seo_title,input.seo_description)
    returning id into saved_id;
  else
    update public.products set name=input.name,slug=input.slug,sku=input.sku,manufacturer_reference=input.manufacturer_reference,
      barcode=input.barcode,brand_id=input.brand_id,short_description=input.short_description,description=input.description,
      price=input.price,compare_at_price=input.compare_at_price,cost_price=input.cost_price,tax_rate=input.tax_rate,
      main_image_url=input.main_image_url,status=input.status,published_at=input.published_at,stock_tracking=input.stock_tracking,
      allow_backorder=input.allow_backorder,featured=input.featured,is_new=input.is_new,is_best_seller=input.is_best_seller,
      is_on_sale=input.is_on_sale,seo_title=input.seo_title,seo_description=input.seo_description
      where id=p_product_id returning id into saved_id;
    if not found then raise exception 'Produit introuvable'; end if;
  end if;
  delete from public.product_categories where product_id=saved_id;
  insert into public.product_categories(product_id,category_id,is_primary)
    select saved_id, id, id=p_primary_category_id from unnest(p_category_ids) as id;
  if not exists(select 1 from public.inventory where product_id=saved_id and variant_id is null) then
    insert into public.inventory(product_id,quantity,low_stock_threshold) values(saved_id,p_stock,p_low_stock_threshold);
  else
    update public.inventory set low_stock_threshold=p_low_stock_threshold where product_id=saved_id and variant_id is null;
  end if;
  perform public.save_product_color_variants(saved_id,p_variants);
  return saved_id;
end;
$$;

revoke all on function public.categories_include_appareillage(uuid[]) from public, anon;
grant execute on function public.categories_include_appareillage(uuid[]) to authenticated, service_role;
revoke all on function public.save_product_color_variants(uuid,jsonb) from public, anon;
grant execute on function public.save_product_color_variants(uuid,jsonb) to authenticated;
revoke all on function public.save_product_with_color_variants(uuid,jsonb,uuid[],uuid,integer,integer,jsonb) from public, anon;
grant execute on function public.save_product_with_color_variants(uuid,jsonb,uuid[],uuid,integer,integer,jsonb) to authenticated;

create or replace function public.create_order_from_cart(
  p_user_id uuid, p_email text, p_phone text, p_items jsonb,
  p_shipping_address jsonb, p_billing_address jsonb, p_customer_note text default null
) returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  created_order public.orders;
  item jsonb;
  normalized_items jsonb;
  validated_items jsonb := '[]'::jsonb;
  selected_product public.products;
  selected_variant public.product_variants;
  selected_inventory public.inventory;
  requested_variant uuid;
  requested_quantity integer;
  selected_price numeric(12,2);
  line_subtotal numeric(12,2);
  line_tax numeric(12,2);
  calculated_subtotal numeric(12,2) := 0;
  calculated_tax numeric(12,2) := 0;
  snapshot jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or coalesce(jsonb_array_length(p_items),0) = 0 then raise exception 'Le panier est vide'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Panier trop volumineux'; end if;
  if nullif(trim(p_email),'') is null or nullif(trim(p_phone),'') is null then raise exception 'Email et téléphone requis'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if coalesce(item->>'quantity','') !~ '^[0-9]+$' or (item->>'quantity')::integer <= 0 or nullif(item->>'product_id','') is null then raise exception 'Quantité ou produit invalide'; end if;
  end loop;
  -- Aggregate repeated lines so a split request cannot evade the stock check.
  select jsonb_agg(jsonb_build_object('product_id',product_id,'variant_id',variant_id,'quantity',quantity)) into normalized_items
  from (select (value->>'product_id')::uuid product_id, nullif(value->>'variant_id','')::uuid variant_id,
    sum((value->>'quantity')::integer) quantity from jsonb_array_elements(p_items) group by 1,2) lines;

  -- Fixed lock order coordinates product edits, checkout and the existing order workflow.
  perform 1 from public.products where id in (select (value->>'product_id')::uuid from jsonb_array_elements(normalized_items)) order by id for share;
  perform 1 from public.product_variants where id in (select (value->>'variant_id')::uuid from jsonb_array_elements(normalized_items)) order by id for share;
  perform 1 from public.inventory i where exists(select 1 from jsonb_array_elements(normalized_items) x
    where i.product_id=(x->>'product_id')::uuid and i.variant_id is not distinct from (x->>'variant_id')::uuid)
    order by i.product_id, i.variant_id nulls first for update;

  for item in select value from jsonb_array_elements(normalized_items) loop
    requested_quantity := (item->>'quantity')::integer;
    requested_variant := (item->>'variant_id')::uuid;
    selected_variant := null;
    select * into selected_product from public.products where id=(item->>'product_id')::uuid and status='active' and published_at is not null and published_at<=now();
    if not found then raise exception 'Produit indisponible'; end if;
    if requested_variant is not null then
      if not public.categories_include_appareillage(array(select category_id from public.product_categories where product_id=selected_product.id)) then raise exception 'Variante indisponible'; end if;
      select * into selected_variant from public.product_variants where id=requested_variant and product_id=selected_product.id and is_active and color_name is not null and color_hex is not null and image_path is not null;
      if not found then raise exception 'Couleur indisponible'; end if;
    elsif selected_product.color_variants_enabled and public.categories_include_appareillage(array(select category_id from public.product_categories where product_id=selected_product.id)) then
      raise exception 'Choisissez une couleur pour %',selected_product.name;
    end if;
    select * into selected_inventory from public.inventory where product_id=selected_product.id and variant_id is not distinct from requested_variant;
    if selected_product.stock_tracking and not selected_product.allow_backorder and
      (selected_inventory.id is null or selected_inventory.quantity-selected_inventory.reserved_quantity<requested_quantity)
    then raise exception 'Stock insuffisant pour %',selected_product.name; end if;
    if requested_variant is not null and selected_product.stock_tracking and selected_inventory.id is null then raise exception 'Stock de la couleur introuvable'; end if;
    selected_price := coalesce(selected_variant.price,selected_product.price);
    line_subtotal := selected_price * requested_quantity;
    line_tax := round(line_subtotal-(line_subtotal/(1+selected_product.tax_rate/100)),2);
    calculated_subtotal := calculated_subtotal+line_subtotal;
    calculated_tax := calculated_tax+line_tax;
    snapshot := jsonb_build_object('id',selected_product.id,'name',selected_product.name,'slug',selected_product.slug,
      'sku',coalesce(selected_variant.sku,selected_product.sku),'manufacturer_reference',selected_product.manufacturer_reference,
      'brand_id',selected_product.brand_id,'main_image_url',coalesce(selected_variant.image_path,selected_product.main_image_url),
      'unit_price',selected_price,'tax_rate',selected_product.tax_rate);
    if requested_variant is not null then snapshot := snapshot || jsonb_build_object('variant_id',selected_variant.id,
      'variant_name',selected_variant.name,'color_name',selected_variant.color_name,'color_hex',selected_variant.color_hex,
      'finish',selected_variant.finish,'barcode',selected_variant.barcode,'image_path',selected_variant.image_path); end if;
    validated_items := validated_items || jsonb_build_array(jsonb_build_object('product_id',selected_product.id,'variant_id',requested_variant,
      'variant_name',selected_variant.name,'sku',coalesce(selected_variant.sku,selected_product.sku),'name',selected_product.name,
      'quantity',requested_quantity,'price',selected_price,'subtotal',line_subtotal,'tax',line_tax,
      'inventory_id',selected_inventory.id,'stock_tracking',selected_product.stock_tracking,'snapshot',snapshot));
  end loop;

  insert into public.orders(user_id,email,phone,status,payment_status,fulfillment_status,currency,subtotal,discount_total,shipping_total,tax_total,grand_total,customer_note,shipping_address_snapshot,billing_address_snapshot)
  values(p_user_id,p_email,p_phone,'pending','pending','unfulfilled','MAD',calculated_subtotal,0,0,calculated_tax,calculated_subtotal,p_customer_note,p_shipping_address,p_billing_address)
  returning * into created_order;
  for item in select value from jsonb_array_elements(validated_items) loop
    insert into public.order_items(order_id,product_id,variant_id,variant_name,sku,product_name,quantity,unit_price,discount_amount,tax_amount,line_total,product_snapshot)
    values(created_order.id,(item->>'product_id')::uuid,(item->>'variant_id')::uuid,item->>'variant_name',item->>'sku',item->>'name',
      (item->>'quantity')::integer,(item->>'price')::numeric,0,(item->>'tax')::numeric,(item->>'subtotal')::numeric,item->'snapshot');
    if (item->>'stock_tracking')::boolean then update public.inventory set reserved_quantity=reserved_quantity+(item->>'quantity')::integer,updated_at=now() where id=(item->>'inventory_id')::uuid; end if;
  end loop;
  return created_order;
end;
$$;

revoke all on function public.create_order_from_cart(uuid,text,text,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_order_from_cart(uuid,text,text,jsonb,jsonb,jsonb,text) to service_role;
commit;
