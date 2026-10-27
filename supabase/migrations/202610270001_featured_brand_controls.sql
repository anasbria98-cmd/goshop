-- Explicit featured-logo slots, separate from ordinary catalogue sort_order.
-- One-time capture of the legacy renderer at migration time. No product rows,
-- assignments, existing brand identities, logos or catalogue orders are changed.
begin;
lock table public.brands in share row exclusive mode;
lock table public.products in share mode;
alter table public.brands
  add column show_in_featured_brands boolean not null default false,
  add column display_order integer;

-- The previous renderer substituted JA Solar/Wago artwork and appended INGCO.
-- Resolve those once here, never in storefront code. Preserve empty slots when
-- the legacy output contained duplicates so later logos do not shift.
create temporary table legacy_featured_brand_slots on commit drop as
with old_brands as (
  select b.slug, max(p.created_at) latest
  from public.products p join public.brands b on b.id = p.brand_id
  where p.status = 'active' and p.published_at is not null
  group by b.id, b.slug
), old_order as (
  select slug, row_number() over (order by latest desc, slug) n from old_brands
), mapped as (
  select case slug when 'ja-solar' then 'goled' when 'wago' then 'ingelec' else slug end slug, n
  from old_order
), counted as (
  select slug, n, count(*) filter (where slug = 'goled') over (order by n) goled_count
  from mapped
), visible as (
  select case when slug = 'goled' and goled_count = 2 then 'schneider-electric' else slug end slug,
    row_number() over (order by n)::integer position
  from counted where slug <> 'schneider-electric'
), with_appended as (
  select * from visible
  union all
  select 'ingco', (select count(*)::integer + 1 from visible)
  where exists(select 1 from old_brands) and not exists(select 1 from mapped where slug = 'ingco')
)
select slug, min(position) position from with_appended group by slug;

-- Materialize only legacy display aliases missing from the actual brand model.
-- Existing records and all product-brand foreign keys are retained unchanged.
insert into public.brands(name, slug)
select case slug when 'goled' then 'GOLED' when 'ingelec' then 'Ingelec'
  when 'ingco' then 'INGCO' when 'schneider-electric' then 'Schneider Electric' end, slug
from legacy_featured_brand_slots
where slug in ('goled','ingelec','ingco','schneider-electric')
on conflict (slug) do nothing;

update public.brands b set show_in_featured_brands = true, display_order = s.position
from legacy_featured_brand_slots s where s.slug = b.slug;

alter table public.brands
  add constraint brands_featured_position_range check (display_order between 1 and 1000),
  add constraint brands_featured_position_required check (not show_in_featured_brands or display_order is not null);
create unique index brands_featured_position on public.brands(display_order)
  where show_in_featured_brands;
comment on column public.brands.show_in_featured_brands is 'Explicit admin opt-in; new brands never enter the shared logo grid automatically.';
comment on column public.brands.display_order is 'Exact 1-based logo grid slot; gaps are preserved. Independent of catalogue sort_order.';
-- Existing brands RLS policies continue to enforce public active reads and staff-only writes.
commit;
