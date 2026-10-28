begin;
-- General variant and its initial inventory are one staff-authorized transaction.
create function public.add_product_general_variants(p_product_id uuid,p_variants jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; saved_id uuid; v public.product_variants;
begin
  if not coalesce(public.is_staff(),false) then raise exception 'Accès non autorisé'; end if;
  perform 1 from public.products where id=p_product_id for update;
  if not found then raise exception 'Produit introuvable'; end if;
  if jsonb_typeof(p_variants) is distinct from 'array' then raise exception 'Variantes invalides'; end if;
  for item in select value from jsonb_array_elements(p_variants) loop
    v:=jsonb_populate_record(null::public.product_variants,item);
    if nullif(trim(v.name),'') is null or nullif(trim(v.sku),'') is null
       or length(v.name)>120 or length(v.sku)>80 or length(v.barcode)>80
       or (item->>'stock') is null or (item->>'low_stock_threshold') is null
       or (item->>'stock')::integer<0 or (item->>'low_stock_threshold')::integer<0
       or v.is_active is null then raise exception 'Vérifiez les champs de la variante'; end if;
    if exists(select 1 from public.products where sku=trim(v.sku)) then raise exception 'Ce SKU existe déjà. Choisissez un SKU unique.'; end if;
    insert into public.product_variants(product_id,name,sku,barcode,price,compare_at_price,cost_price,is_active)
      values(p_product_id,trim(v.name),trim(v.sku),nullif(trim(v.barcode),''),v.price,v.compare_at_price,v.cost_price,v.is_active) returning id into saved_id;
    insert into public.inventory(product_id,variant_id,quantity,reserved_quantity,low_stock_threshold)
      values(p_product_id,saved_id,(item->>'stock')::integer,0,(item->>'low_stock_threshold')::integer);
  end loop;
end;
$$;

-- New-product drafts save their product, category links and variants atomically.
create function public.create_product_with_general_variants(p_product jsonb,p_category_ids uuid[],p_primary_category_id uuid,p_stock integer,p_low_stock_threshold integer,p_variants jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; input public.products;
begin
  if not coalesce(public.is_staff(),false) then raise exception 'Accès non autorisé'; end if;
  input:=jsonb_populate_record(null::public.products,p_product);
    insert into public.products(display_colors,name,slug,sku,manufacturer_reference,barcode,brand_id,short_description,description,price,compare_at_price,cost_price,tax_rate,main_image_url,status,published_at,stock_tracking,allow_backorder,featured,is_new,is_best_seller,is_on_sale,seo_title,seo_description)
    values(input.display_colors,input.name,input.slug,input.sku,input.manufacturer_reference,input.barcode,input.brand_id,input.short_description,input.description,input.price,input.compare_at_price,input.cost_price,input.tax_rate,input.main_image_url,input.status,input.published_at,input.stock_tracking,input.allow_backorder,input.featured,input.is_new,input.is_best_seller,input.is_on_sale,input.seo_title,input.seo_description)
    returning id into saved_id;
  insert into public.product_categories(product_id,category_id,is_primary)
    select saved_id,id,id=p_primary_category_id from unnest(p_category_ids) as id;
  insert into public.inventory(product_id,quantity,low_stock_threshold) values(saved_id,p_stock,p_low_stock_threshold);
  perform public.add_product_general_variants(saved_id,p_variants);
  return saved_id;
end;
$$;

create function public.delete_product_variant_safely(p_product_id uuid,p_variant_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(public.is_staff(),false) then raise exception 'Accès non autorisé'; end if;
  perform 1 from public.products where id=p_product_id for update;
  perform 1 from public.product_variants where id=p_variant_id and product_id=p_product_id for update;
  if not found then raise exception 'Variante introuvable'; end if;
  perform 1 from public.inventory where variant_id=p_variant_id for update;
  if exists(select 1 from public.order_items where variant_id=p_variant_id)
     or exists(select 1 from public.inventory_movements where variant_id=p_variant_id) then
    raise exception 'Cette variante possède un historique de commandes ou de stock et ne peut pas être supprimée.';
  end if;
  if exists(select 1 from public.inventory where variant_id=p_variant_id and reserved_quantity>0) then
    raise exception 'Cette variante possède du stock réservé et ne peut pas être supprimée.';
  end if;
  delete from public.product_variants where id=p_variant_id and product_id=p_product_id;
end;
$$;
revoke all on function public.add_product_general_variants(uuid,jsonb) from public,anon;
revoke all on function public.create_product_with_general_variants(jsonb,uuid[],uuid,integer,integer,jsonb) from public,anon;
revoke all on function public.delete_product_variant_safely(uuid,uuid) from public,anon;
grant execute on function public.add_product_general_variants(uuid,jsonb) to authenticated;
grant execute on function public.create_product_with_general_variants(jsonb,uuid[],uuid,integer,integer,jsonb) to authenticated;
grant execute on function public.delete_product_variant_safely(uuid,uuid) to authenticated;

-- Retain the existing checkout calculation/reservation path; allow actual active
-- non-color variants too, validating their product ownership and inventory.
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
      select * into selected_variant from public.product_variants where id=requested_variant and product_id=selected_product.id and is_active and ((color_name is null and color_hex is null and image_path is null) or (color_name is not null and color_hex is not null and image_path is not null and public.categories_include_appareillage(array(select category_id from public.product_categories where product_id=selected_product.id))));
      if not found then
        if not public.categories_include_appareillage(array(select category_id from public.product_categories where product_id=selected_product.id)) then raise exception 'Variante indisponible'; end if;
        raise exception 'Couleur indisponible';
      end if;
    elsif selected_product.color_variants_enabled and public.categories_include_appareillage(array(select category_id from public.product_categories where product_id=selected_product.id)) then
      raise exception 'Choisissez une couleur pour %',selected_product.name;
    elsif exists(select 1 from public.product_variants where product_id=selected_product.id and is_active and color_name is null and color_hex is null and image_path is null) then
      raise exception 'Choisissez une variante pour %',selected_product.name;
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
