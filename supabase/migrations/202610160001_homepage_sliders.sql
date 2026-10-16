-- Homepage content only. Existing catalogue, roles and policies are unchanged.
create table public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  alt text not null check (length(trim(alt)) between 1 and 300),
  image_url text not null,
  location text not null check (location in ('primary','secondary')),
  link_type text not null default 'none' check (link_type in ('none','category','product','custom')),
  category_id uuid references public.categories(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  custom_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (custom_url is null or custom_url ~ '^(/[^/]|/$|https?://)'),
  check (image_url ~ '^(/promotions/|https?://)')
);
create index homepage_slides_location_order on public.homepage_slides(location, sort_order, id);
alter table public.homepage_slides enable row level security;
grant select on public.homepage_slides to anon, authenticated;
grant insert, update, delete on public.homepage_slides to authenticated;
create policy slides_public_read on public.homepage_slides for select to authenticated using (is_active or public.is_admin());
create policy slides_anon_read on public.homepage_slides for select to anon using (is_active);
create policy slides_admin_insert on public.homepage_slides for insert with check (public.is_admin());
create policy slides_admin_update on public.homepage_slides for update using (public.is_admin()) with check (public.is_admin());
create policy slides_admin_delete on public.homepage_slides for delete using (public.is_admin());
create trigger homepage_slides_updated before update on public.homepage_slides for each row execute function public.set_updated_at();

-- A single transaction and a complete ID list prevent partial/duplicate ordering.
create function public.reorder_homepage_slides(p_location text, p_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if p_location not in ('primary','secondary') then raise exception 'Invalid location'; end if;
  lock table public.homepage_slides in share row exclusive mode;
  if cardinality(p_ids) <> (select count(*) from public.homepage_slides where location=p_location)
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists(select 1 from unnest(p_ids) proposed(id) where not exists(select 1 from public.homepage_slides s where s.id=proposed.id and s.location=p_location))
  then raise exception 'Slides changed; reload before reordering'; end if;
  update public.homepage_slides s set sort_order = ordered.position - 1
  from unnest(p_ids) with ordinality as ordered(id,position) where s.id=ordered.id;
end $$;
revoke all on function public.reorder_homepage_slides(text,uuid[]) from public;
grant execute on function public.reorder_homepage_slides(text,uuid[]) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('homepage-slides','homepage-slides',true,8388608,array['image/jpeg','image/png','image/webp']);
create policy slides_storage_read on storage.objects for select using (bucket_id='homepage-slides');
create policy slides_storage_insert on storage.objects for insert with check (bucket_id='homepage-slides' and public.is_admin());
create policy slides_storage_update on storage.objects for update using (bucket_id='homepage-slides' and public.is_admin()) with check (bucket_id='homepage-slides' and public.is_admin());
create policy slides_storage_delete on storage.objects for delete using (bucket_id='homepage-slides' and public.is_admin());

-- Keep the exact original artwork and order; resolve current category paths at render time.
insert into public.homepage_slides(name,alt,image_url,location,link_type,category_id,custom_url,sort_order)
select v.name,v.alt,'/promotions/'||v.slug||'.png',v.location,
  case when c.id is null then 'custom' else 'category' end,c.id,
  case when c.id is null then '/recherche?q='||v.query else null end,v.position
from (values
 ('omega','Omega','Omega — Color your way : collections Prestige, Déco et Nature','primary',0,'Omega'),
 ('galaxy','LAP Galaxy','LAP Galaxy — Double prise 2P+T 16A certifiée NM','primary',1,'LAP%20Galaxy'),
 ('karla','Karla','Karla — L’esprit Scandinave : Metallic, Color et Design','secondary',0,'Karla'),
 ('millenium','LAP Millenium','LAP Millenium — Interrupteurs, poussoirs et prises décoratifs : qualité et choix de couleurs','secondary',1,'LAP%20Millenium')
) v(slug,name,alt,location,position,query)
left join public.categories c on c.slug=v.slug;
