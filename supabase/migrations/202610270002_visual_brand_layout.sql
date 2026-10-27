-- Preserve every existing placement; store the extent so trailing empty slots survive.
begin;
create table public.featured_brand_layout (
  id boolean primary key default true check (id),
  slot_count integer not null default 0 check (slot_count between 0 and 1000)
);
insert into public.featured_brand_layout(id,slot_count)
select true,coalesce(max(display_order) filter (where show_in_featured_brands),0) from public.brands;
alter table public.featured_brand_layout enable row level security;
grant select on public.featured_brand_layout to anon,authenticated;
grant update on public.featured_brand_layout to authenticated;
create policy featured_layout_read on public.featured_brand_layout for select using (true);
create policy featured_layout_staff_update on public.featured_brand_layout for update
  using (public.is_staff()) with check (public.is_staff());

create function public.save_featured_brand_layout(p_expected uuid[],p_slots uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare current_slots uuid[];
begin
  if not public.is_staff() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_slots is null or p_expected is null or cardinality(p_slots)>1000 or cardinality(p_expected)>1000
    or coalesce(array_ndims(p_slots),1)>1 or coalesce(array_ndims(p_expected),1)>1
  then raise exception 'INVALID_LAYOUT'; end if;
  -- Serialize with both brand editing and other visual saves.
  lock table public.brands in share row exclusive mode;
  perform id from public.featured_brand_layout where id for update;
  select coalesce(array_agg(b.id order by s.position),'{}'::uuid[]) into current_slots
  from public.featured_brand_layout l
  cross join lateral generate_series(1,l.slot_count) s(position)
  left join public.brands b on b.show_in_featured_brands and b.display_order=s.position;
  if current_slots is distinct from p_expected then raise exception 'LAYOUT_CHANGED'; end if;
  if (select count(id)<>count(distinct id) from unnest(p_slots) id) then raise exception 'DUPLICATE_BRAND'; end if;
  if exists(select 1 from unnest(p_slots) proposed(id) where proposed.id is not null
    and not exists(select 1 from public.brands b where b.id=proposed.id)) then raise exception 'BRAND_NOT_FOUND'; end if;

  -- Release the unique occupied-slot index before swaps; all writes are one transaction.
  update public.brands b set show_in_featured_brands=false,
    display_order=case when b.id=any(array_remove(p_slots,null)) then b.display_order else null end
  where b.show_in_featured_brands and not exists (
    select 1 from unnest(p_slots) with ordinality s(id,position) where s.id=b.id and s.position=b.display_order
  );
  update public.brands b set show_in_featured_brands=true,display_order=s.position
    from unnest(p_slots) with ordinality s(id,position) where b.id=s.id
      and (not b.show_in_featured_brands or b.display_order is distinct from s.position);
  update public.featured_brand_layout set slot_count=cardinality(p_slots) where id and slot_count<>cardinality(p_slots);
end $$;
revoke all on function public.save_featured_brand_layout(uuid[],uuid[]) from public;
grant execute on function public.save_featured_brand_layout(uuid[],uuid[]) to authenticated;
commit;
