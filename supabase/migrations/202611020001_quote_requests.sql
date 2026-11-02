-- Additive quote-request storage only. Existing catalogue/orders/users are untouched.
create table public.quote_requests (
  id uuid primary key,
  payload_hash text not null,
  rate_key text not null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (char_length(email) <= 254),
  phone text not null check (phone ~ '^\+212[5-7][0-9]{8}$'),
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  status text not null default 'processing' check (status in ('processing', 'received', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_requests_rate_idx on public.quote_requests (rate_key, created_at);
alter table public.quote_requests enable row level security;
revoke all on public.quote_requests from anon, authenticated;
grant select on public.quote_requests to authenticated;
create policy quote_staff_read on public.quote_requests for select to authenticated using (public.is_staff());
grant all on public.quote_requests to service_role;

-- Atomic idempotency + shared database rate limit, including concurrent requests.
create function public.claim_quote_request(p_id uuid, p_hash text, p_rate_key text, p_input jsonb)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare existing public.quote_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into existing from public.quote_requests where id = p_id for update;
  if found then
    if existing.payload_hash <> p_hash then return 'mismatch'; end if;
    if existing.status = 'received' then return 'saved'; end if;
    if existing.status = 'processing' and existing.updated_at > now() - interval '10 minutes' then return 'busy'; end if;
    update public.quote_requests set status = 'processing', updated_at = now() where id = p_id;
    return 'claimed';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 1));
  if (select count(*) from public.quote_requests where rate_key = p_rate_key and created_at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.quote_requests where rate_key = p_rate_key and created_at > now() - interval '1 day') >= 20 then return 'limited'; end if;
  insert into public.quote_requests (id,payload_hash,rate_key,first_name,last_name,email,phone,category_id,category_name,subject,message)
  values (p_id,p_hash,p_rate_key,p_input->>'first_name',p_input->>'last_name',p_input->>'email',p_input->>'phone',nullif(p_input->>'category_id','general')::uuid,p_input->>'category_name',p_input->>'subject',p_input->>'message');
  return 'claimed';
end $$;
revoke all on function public.claim_quote_request(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_quote_request(uuid,text,text,jsonb) to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('quote-attachments','quote-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
do $$ begin
  if exists (select 1 from storage.buckets where id = 'quote-attachments' and public) then
    raise exception 'quote-attachments must be private; refusing an unsafe existing bucket';
  end if;
end $$;
-- No anonymous upload/read. Only the server service role writes; authorized staff can read.
create policy quote_attachments_staff_read on storage.objects for select to authenticated
using (bucket_id = 'quote-attachments' and public.is_staff());
