-- Run this in the SQL Editor of the AUTH Supabase project.
-- Login request tokens are short-lived, single-use Google nonce values.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.google_login_requests (
  request_id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired', 'invalid')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz
);

create index if not exists google_login_requests_expires_at_idx
  on public.google_login_requests (expires_at)
  where status = 'pending';

alter table public.google_login_requests enable row level security;
revoke all on table public.google_login_requests from anon, authenticated;
grant all on table public.google_login_requests to service_role;

create or replace function public.create_google_login_request()
returns table (request_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request_id uuid := gen_random_uuid();
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at timestamptz := now() + interval '30 minutes';
begin
  insert into public.google_login_requests (request_id, token_hash, expires_at)
  values (
    v_request_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at
  );

  return query select v_request_id, v_token, v_expires_at;
end;
$$;

create or replace function public.validate_google_login_request(p_request_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_valid boolean;
begin
  update public.google_login_requests
  set status = 'expired'
  where request_id = p_request_id
    and status = 'pending'
    and expires_at <= now();

  select exists (
    select 1
    from public.google_login_requests
    where request_id = p_request_id
      and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and status = 'pending'
      and expires_at > now()
  ) into v_valid;

  return v_valid;
end;
$$;

create or replace function public.complete_google_login_request(p_request_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated integer;
begin
  update public.google_login_requests
  set status = 'expired'
  where request_id = p_request_id
    and status = 'pending'
    and expires_at <= now();

  update public.google_login_requests
  set status = 'completed', completed_at = now()
  where request_id = p_request_id
    and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and status = 'pending'
    and expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.create_google_login_request() from public, anon, authenticated;
revoke all on function public.validate_google_login_request(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_google_login_request(uuid, text) from public, anon, authenticated;
grant execute on function public.create_google_login_request() to service_role;
grant execute on function public.validate_google_login_request(uuid, text) to service_role;
grant execute on function public.complete_google_login_request(uuid, text) to service_role;
