begin;
-- Optional display-only colors; existing variants, products and RLS stay intact.
-- NULL preserves legacy variant swatches until a product's color list is saved.
alter table public.products add column display_colors jsonb;
comment on column public.products.display_colors is 'Optional {enabled:boolean,colors:[{name,hex}]} catalogue swatches, independent of sellable variants. NULL preserves legacy variant colors.';


-- Preserve the existing transactional variant workflow; include only the new field.
create or replace function public.save_product_with_color_variants(
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
    insert into public.products(display_colors,name,slug,sku,manufacturer_reference,barcode,brand_id,short_description,description,price,compare_at_price,cost_price,tax_rate,main_image_url,status,published_at,stock_tracking,allow_backorder,featured,is_new,is_best_seller,is_on_sale,seo_title,seo_description)
    values(input.display_colors,input.name,input.slug,input.sku,input.manufacturer_reference,input.barcode,input.brand_id,input.short_description,input.description,input.price,input.compare_at_price,input.cost_price,input.tax_rate,input.main_image_url,input.status,input.published_at,input.stock_tracking,input.allow_backorder,input.featured,input.is_new,input.is_best_seller,input.is_on_sale,input.seo_title,input.seo_description)
    returning id into saved_id;
  else
    update public.products set display_colors=case when p_product ? 'display_colors' then input.display_colors else display_colors end,name=input.name,slug=input.slug,sku=input.sku,manufacturer_reference=input.manufacturer_reference,
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
commit;
