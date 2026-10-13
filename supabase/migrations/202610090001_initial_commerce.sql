begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'staff', 'admin', 'super_admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.attribute_type as enum ('text', 'number', 'boolean', 'select');
create type public.inventory_movement_type as enum ('purchase', 'sale', 'manual_adjustment', 'return', 'cancellation', 'restock');
create type public.cart_status as enum ('active', 'converted', 'abandoned');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.fulfillment_status as enum ('unfulfilled', 'partially_fulfilled', 'fulfilled', 'returned', 'cancelled');
create type public.shipment_status as enum ('pending', 'ready', 'shipped', 'delivered', 'returned', 'cancelled');
create type public.promotion_type as enum ('percentage', 'fixed');
create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  parent_id uuid references public.categories(id) on delete restrict,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  show_in_navigation boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  website_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  sku text not null unique,
  manufacturer_reference text,
  barcode text unique,
  brand_id uuid references public.brands(id) on delete set null,
  status public.product_status not null default 'draft',
  product_type text not null default 'simple',
  main_image_url text,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  tax_rate numeric(5,2) not null default 20 check (tax_rate between 0 and 100),
  stock_tracking boolean not null default true,
  allow_backorder boolean not null default false,
  weight numeric(10,3) check (weight is null or weight >= 0),
  width numeric(10,2) check (width is null or width >= 0),
  height numeric(10,2) check (height is null or height >= 0),
  length numeric(10,2) check (length is null or length >= 0),
  featured boolean not null default false,
  is_new boolean not null default false,
  is_best_seller boolean not null default false,
  is_on_sale boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  primary key (product_id, category_id)
);

create unique index product_categories_one_primary
  on public.product_categories(product_id) where is_primary;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, storage_path)
);

create unique index product_images_one_primary
  on public.product_images(product_id) where is_primary;

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type public.attribute_type not null,
  unit text,
  is_filterable boolean not null default false,
  is_searchable boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  unique(attribute_id, value)
);

create table public.category_attributes (
  category_id uuid not null references public.categories(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  primary key(category_id, attribute_id)
);

create table public.product_attribute_values (
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  option_id uuid references public.attribute_options(id) on delete set null,
  text_value text,
  number_value numeric,
  boolean_value boolean,
  primary key(product_id, attribute_id),
  constraint product_attribute_one_value check (
    num_nonnulls(option_id, text_value, number_value, boolean_value) = 1
  )
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text not null unique,
  barcode text unique,
  price numeric(12,2) check (price is null or price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= coalesce(price, 0)),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 0,
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  constraint inventory_reserved_not_excessive check (reserved_quantity <= greatest(quantity, reserved_quantity))
);

create unique index inventory_product_without_variant
  on public.inventory(product_id) where variant_id is null;
create unique index inventory_product_variant
  on public.inventory(product_id, variant_id) where variant_id is not null;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  type public.inventory_movement_type not null,
  quantity_change integer not null check (quantity_change <> 0),
  previous_quantity integer not null,
  new_quantity integer not null,
  reason text,
  reference text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  phone text not null,
  company text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text,
  postal_code text,
  country text not null default 'MA',
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index addresses_default_shipping
  on public.addresses(user_id) where is_default_shipping;
create unique index addresses_default_billing
  on public.addresses(user_id) where is_default_billing;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid,
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_has_owner check (user_id is not null or session_id is not null)
);

create unique index carts_active_user on public.carts(user_id) where user_id is not null and status = 'active';
create unique index carts_active_session on public.carts(session_id) where session_id is not null and status = 'active';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index cart_items_unique_simple on public.cart_items(cart_id, product_id) where variant_id is null;
create unique index cart_items_unique_variant on public.cart_items(cart_id, product_id, variant_id) where variant_id is not null;

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, product_id)
);

create sequence public.order_number_sequence;

create or replace function public.generate_order_number()
returns text language sql volatile set search_path = '' as $$
  select 'GO-' || extract(year from now())::int || '-' || lpad(nextval('public.order_number_sequence')::text, 6, '0');
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  phone text not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  currency char(3) not null default 'MAD',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  customer_note text,
  admin_note text,
  shipping_address_snapshot jsonb not null,
  billing_address_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  product_name text not null,
  variant_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  product_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'MAD',
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  free_shipping_threshold numeric(12,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  shipping_method_id uuid references public.shipping_methods(id) on delete set null,
  carrier text,
  tracking_number text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  type public.promotion_type not null,
  value numeric(12,2) not null check (value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount numeric(12,2) check (maximum_discount is null or maximum_discount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_percentage_limit check (type <> 'percentage' or value <= 100),
  constraint promotion_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(promotion_id, product_id)
);

create table public.promotion_categories (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key(promotion_id, category_id)
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  unique(promotion_id, order_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  content text,
  status public.review_status not null default 'pending',
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  group_name text not null default 'general',
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'product-images',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  alt_text text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(bucket, storage_path)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index categories_slug_idx on public.categories(slug);
create unique index categories_root_slug_unique on public.categories(slug) where parent_id is null;
create unique index categories_sibling_slug_unique on public.categories(parent_id, slug) where parent_id is not null;
create index categories_parent_idx on public.categories(parent_id);
create index categories_active_sort_idx on public.categories(is_active, sort_order);
create index brands_active_sort_idx on public.brands(is_active, sort_order);
create index products_slug_idx on public.products(slug);
create index products_sku_idx on public.products(sku);
create index products_status_idx on public.products(status);
create index products_brand_idx on public.products(brand_id);
create index products_created_idx on public.products(created_at desc);
create index products_flags_idx on public.products(featured, is_best_seller, is_new, is_on_sale) where status = 'active';
create index products_search_idx on public.products using gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(manufacturer_reference,'')));
create index product_categories_category_idx on public.product_categories(category_id, product_id);
create index product_images_product_sort_idx on public.product_images(product_id, sort_order);
create index inventory_low_stock_idx on public.inventory(quantity, low_stock_threshold);
create index inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);
create index addresses_user_idx on public.addresses(user_id);
create index cart_items_cart_idx on public.cart_items(cart_id);
create index favorites_user_idx on public.favorites(user_id);
create index orders_number_idx on public.orders(order_number);
create index orders_user_idx on public.orders(user_id);
create index orders_created_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status);
create index order_items_order_idx on public.order_items(order_id);
create index payments_order_idx on public.payments(order_id);
create index shipments_order_idx on public.shipments(order_id);
create index reviews_product_status_idx on public.reviews(product_id, status);
create index reviews_user_idx on public.reviews(user_id);
create index audit_created_idx on public.admin_audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','categories','brands','products','attributes','product_variants',
    'inventory','addresses','carts','cart_items','orders','payments',
    'shipping_methods','shipments','promotions','reviews','store_settings'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, first_name, last_name)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role() in ('staff','admin','super_admin'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role() in ('admin','super_admin'), false);
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role() = 'super_admin', false);
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
    and not public.is_super_admin()
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and session_user not in ('postgres', 'supabase_admin')
  then
    raise exception 'Only a super administrator may change roles';
  end if;
  if old.role = 'super_admin' and new.role <> 'super_admin' and auth.uid() = old.id then
    raise exception 'A super administrator cannot demote their own account';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.prevent_category_cycle()
returns trigger language plpgsql set search_path = '' as $$
declare found_cycle boolean;
begin
  if new.parent_id is null then return new; end if;
  with recursive ancestors as (
    select id, parent_id from public.categories where id = new.parent_id
    union all
    select c.id, c.parent_id from public.categories c join ancestors a on c.id = a.parent_id
  ) select exists(select 1 from ancestors where id = new.id) into found_cycle;
  if found_cycle then raise exception 'Category hierarchy cycle detected'; end if;
  return new;
end;
$$;

create trigger categories_prevent_cycle before insert or update of parent_id on public.categories
for each row execute function public.prevent_category_cycle();

create or replace function public.validate_inventory()
returns trigger language plpgsql set search_path = '' as $$
declare backorders boolean;
begin
  select allow_backorder into backorders from public.products where id = new.product_id;
  if new.quantity < 0 and not coalesce(backorders, false) then
    raise exception 'Inventory cannot be negative when backorders are disabled';
  end if;
  if new.reserved_quantity > new.quantity and not coalesce(backorders, false) then
    raise exception 'Reserved inventory exceeds available inventory';
  end if;
  if new.variant_id is not null and not exists(
    select 1 from public.product_variants where id = new.variant_id and product_id = new.product_id
  ) then raise exception 'Variant does not belong to product'; end if;
  return new;
end;
$$;

create trigger inventory_validate before insert or update on public.inventory
for each row execute function public.validate_inventory();

create or replace function public.adjust_inventory(
  inventory_id uuid,
  quantity_delta integer,
  movement_type public.inventory_movement_type,
  movement_reason text default null,
  movement_reference text default null
) returns public.inventory
language plpgsql security definer set search_path = '' as $$
declare current_row public.inventory;
declare updated_row public.inventory;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if quantity_delta = 0 then raise exception 'Quantity change cannot be zero'; end if;
  select * into current_row from public.inventory where id = inventory_id for update;
  if not found then raise exception 'Inventory row not found'; end if;
  update public.inventory set quantity = quantity + quantity_delta
    where id = inventory_id returning * into updated_row;
  insert into public.inventory_movements(product_id, variant_id, type, quantity_change, previous_quantity, new_quantity, reason, reference, created_by)
  values(updated_row.product_id, updated_row.variant_id, movement_type, quantity_delta, current_row.quantity, updated_row.quantity, movement_reason, movement_reference, auth.uid());
  return updated_row;
end;
$$;

create or replace function public.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_staff() then
    insert into public.admin_audit_logs(admin_user_id, action, entity_type, entity_id, old_data, new_data)
    values(auth.uid(), lower(tg_op), tg_table_name,
      coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key'),
      case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
      case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','categories','brands','products','product_images','product_variants',
    'inventory','orders','payments','shipments','promotions','reviews','store_settings','media_assets'
  ] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_admin_change()', table_name, table_name);
  end loop;
end $$;

create or replace function public.category_descendants(root_slug text)
returns table(id uuid) language sql stable set search_path = '' as $$
  with recursive tree as (
    select c.id from public.categories c where c.slug = root_slug and c.parent_id is null and c.is_active
    union all
    select child.id from public.categories child join tree parent on child.parent_id = parent.id where child.is_active
  ) select tree.id from tree;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_images enable row level security;
alter table public.attributes enable row level security;
alter table public.attribute_options enable row level security;
alter table public.category_attributes enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipments enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.promotion_categories enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.reviews enable row level security;
alter table public.store_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy profiles_own_read on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_own_update on public.profiles for update using (id = auth.uid() or public.is_super_admin()) with check (id = auth.uid() or public.is_super_admin());

create policy categories_public_read on public.categories for select using (is_active or public.is_staff());
create policy categories_staff_manage on public.categories for all using (public.is_staff()) with check (public.is_staff());
create policy brands_public_read on public.brands for select using (is_active or public.is_staff());
create policy brands_staff_manage on public.brands for all using (public.is_staff()) with check (public.is_staff());
create policy products_public_read on public.products for select using ((status = 'active' and published_at is not null and published_at <= now()) or public.is_staff());
create policy products_staff_manage on public.products for all using (public.is_staff()) with check (public.is_staff());

create policy product_categories_public_read on public.product_categories for select using (
  exists(select 1 from public.products p where p.id = product_id and p.status = 'active') or public.is_staff()
);
create policy product_categories_staff_manage on public.product_categories for all using (public.is_staff()) with check (public.is_staff());
create policy product_images_public_read on public.product_images for select using (
  exists(select 1 from public.products p where p.id = product_id and p.status = 'active') or public.is_staff()
);
create policy product_images_staff_manage on public.product_images for all using (public.is_staff()) with check (public.is_staff());

create policy attributes_public_read on public.attributes for select using (true);
create policy attributes_staff_manage on public.attributes for all using (public.is_staff()) with check (public.is_staff());
create policy attribute_options_public_read on public.attribute_options for select using (true);
create policy attribute_options_staff_manage on public.attribute_options for all using (public.is_staff()) with check (public.is_staff());
create policy category_attributes_public_read on public.category_attributes for select using (true);
create policy category_attributes_staff_manage on public.category_attributes for all using (public.is_staff()) with check (public.is_staff());
create policy product_attribute_values_public_read on public.product_attribute_values for select using (
  exists(select 1 from public.products p where p.id = product_id and p.status = 'active') or public.is_staff()
);
create policy product_attribute_values_staff_manage on public.product_attribute_values for all using (public.is_staff()) with check (public.is_staff());
create policy variants_public_read on public.product_variants for select using (
  (is_active and exists(select 1 from public.products p where p.id = product_id and p.status = 'active')) or public.is_staff()
);
create policy variants_staff_manage on public.product_variants for all using (public.is_staff()) with check (public.is_staff());

create policy inventory_public_read on public.inventory for select using (
  exists(select 1 from public.products p where p.id = product_id and p.status = 'active') or public.is_staff()
);
create policy inventory_staff_manage on public.inventory for all using (public.is_staff()) with check (public.is_staff());
create policy inventory_movements_staff_read on public.inventory_movements for select using (public.is_staff());
create policy inventory_movements_staff_insert on public.inventory_movements for insert with check (public.is_staff());

create policy addresses_own on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_staff_read on public.addresses for select using (public.is_staff());
create policy carts_own on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_own on public.cart_items for all using (
  exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
) with check (
  exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);
create policy favorites_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy orders_own_read on public.orders for select using (user_id = auth.uid() or public.is_staff());
create policy orders_staff_manage on public.orders for all using (public.is_staff()) with check (public.is_staff());
create policy order_items_own_read on public.order_items for select using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff()))
);
create policy order_items_staff_manage on public.order_items for all using (public.is_staff()) with check (public.is_staff());
create policy payments_own_read on public.payments for select using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff()))
);
create policy payments_staff_manage on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy shipping_methods_public_read on public.shipping_methods for select using (is_active or public.is_staff());
create policy shipping_methods_staff_manage on public.shipping_methods for all using (public.is_staff()) with check (public.is_staff());
create policy shipments_own_read on public.shipments for select using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff()))
);
create policy shipments_staff_manage on public.shipments for all using (public.is_staff()) with check (public.is_staff());

create policy promotions_public_read on public.promotions for select using (
  (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.is_staff()
);
create policy promotions_staff_manage on public.promotions for all using (public.is_staff()) with check (public.is_staff());
create policy promotion_products_public_read on public.promotion_products for select using (true);
create policy promotion_products_staff_manage on public.promotion_products for all using (public.is_staff()) with check (public.is_staff());
create policy promotion_categories_public_read on public.promotion_categories for select using (true);
create policy promotion_categories_staff_manage on public.promotion_categories for all using (public.is_staff()) with check (public.is_staff());
create policy promotion_redemptions_own_read on public.promotion_redemptions for select using (user_id = auth.uid() or public.is_staff());
create policy promotion_redemptions_staff_manage on public.promotion_redemptions for all using (public.is_staff()) with check (public.is_staff());

create policy reviews_public_read on public.reviews for select using (status = 'approved' or user_id = auth.uid() or public.is_staff());
create policy reviews_own_insert on public.reviews for insert with check (user_id = auth.uid() and status = 'pending');
create policy reviews_own_update on public.reviews for update using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'pending');
create policy reviews_staff_manage on public.reviews for all using (public.is_staff()) with check (public.is_staff());

create policy settings_public_read on public.store_settings for select using (is_public or public.is_staff());
create policy settings_admin_manage on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
create policy media_public_read on public.media_assets for select using (true);
create policy media_staff_manage on public.media_assets for all using (public.is_staff()) with check (public.is_staff());
create policy audit_admin_read on public.admin_audit_logs for select using (public.is_admin());
create policy audit_system_insert on public.admin_audit_logs for insert with check (public.is_staff());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_public_read on storage.objects for select using (bucket_id = 'product-images');
create policy product_images_storage_staff_insert on storage.objects for insert with check (bucket_id = 'product-images' and public.is_staff());
create policy product_images_storage_staff_update on storage.objects for update using (bucket_id = 'product-images' and public.is_staff()) with check (bucket_id = 'product-images' and public.is_staff());
create policy product_images_storage_staff_delete on storage.objects for delete using (bucket_id = 'product-images' and public.is_staff());

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.category_descendants(text) to anon, authenticated;
grant execute on function public.adjust_inventory(uuid, integer, public.inventory_movement_type, text, text) to authenticated;

commit;
