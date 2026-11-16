create table if not exists public.temp_mailboxes (
  id uuid primary key default gen_random_uuid(),
  local_part text not null check (local_part ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  email_address text not null unique,
  ip_hash text not null,
  browser_hash text not null,
  access_token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists temp_mailboxes_ip_expiry_idx
  on public.temp_mailboxes (ip_hash, expires_at);
create index if not exists temp_mailboxes_browser_expiry_idx
  on public.temp_mailboxes (browser_hash, expires_at);

create table if not exists public.temp_mail_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.temp_mailboxes(id) on delete cascade,
  resend_email_id text not null,
  sender text not null default '',
  subject text not null default '',
  text_body text not null default '',
  html_body text not null default '',
  received_at timestamptz not null default now(),
  unique (mailbox_id, resend_email_id)
);

create index if not exists temp_mail_messages_mailbox_received_idx
  on public.temp_mail_messages (mailbox_id, received_at desc);

alter table public.temp_mailboxes enable row level security;
alter table public.temp_mail_messages enable row level security;
revoke all on public.temp_mailboxes, public.temp_mail_messages from anon, authenticated;
grant all on public.temp_mailboxes, public.temp_mail_messages to service_role;

create or replace function public.temp_mail_create_mailbox(
  p_local_part text,
  p_ip_hash text,
  p_browser_hash text,
  p_access_token_hash text
)
returns table (result text, mailbox_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local_part text := lower(p_local_part);
  v_email text := lower(p_local_part) || '@visora.my.id';
  v_lock bigint;
  v_id uuid;
  v_expires timestamptz := now() + interval '24 hours';
begin
  for v_lock in
    select distinct lock_id
    from unnest(array[
      hashtextextended('ip:' || p_ip_hash, 0),
      hashtextextended('browser:' || p_browser_hash, 0),
      hashtextextended('mailbox:' || v_email, 0)
    ]) as locks(lock_id)
    order by lock_id
  loop
    perform pg_advisory_xact_lock(v_lock);
  end loop;

  delete from public.temp_mailboxes where temp_mailboxes.expires_at <= now();

  if (select count(*) from public.temp_mailboxes m where m.ip_hash = p_ip_hash and m.expires_at > now()) >= 5 then
    return query select 'ip_limit'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if (select count(*) from public.temp_mailboxes m where m.browser_hash = p_browser_hash and m.expires_at > now()) >= 5 then
    return query select 'browser_limit'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if exists (select 1 from public.temp_mailboxes m where m.email_address = v_email and m.expires_at > now()) then
    return query select 'taken'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.temp_mailboxes (
    local_part, email_address, ip_hash, browser_hash, access_token_hash, expires_at
  ) values (
    v_local_part, v_email, p_ip_hash, p_browser_hash, p_access_token_hash, v_expires
  ) returning id into v_id;

  return query select 'created'::text, v_id, v_expires;
end;
$$;

revoke all on function public.temp_mail_create_mailbox(text, text, text, text) from public, anon, authenticated;
grant execute on function public.temp_mail_create_mailbox(text, text, text, text) to service_role;
