create table if not exists public.temp_mail_send_attempts (
  id bigint generated always as identity primary key,
  mailbox_id uuid not null references public.temp_mailboxes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists temp_mail_send_attempts_mailbox_created_idx
  on public.temp_mail_send_attempts (mailbox_id, created_at desc);

alter table public.temp_mail_send_attempts enable row level security;
revoke all on public.temp_mail_send_attempts from anon, authenticated;
grant all on public.temp_mail_send_attempts to service_role;

grant usage, select on sequence public.temp_mail_send_attempts_id_seq to service_role;

create or replace function public.temp_mail_reserve_send(p_mailbox_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('temp-mail-send:' || p_mailbox_id::text, 0));

  if not exists (
    select 1 from public.temp_mailboxes m
    where m.id = p_mailbox_id and m.expires_at > now()
  ) then
    return false;
  end if;

  select count(*) into v_count
  from public.temp_mail_send_attempts a
  where a.mailbox_id = p_mailbox_id
    and a.created_at > now() - interval '24 hours';

  if v_count >= 5 then
    return false;
  end if;

  insert into public.temp_mail_send_attempts (mailbox_id) values (p_mailbox_id);
  return true;
end;
$$;

revoke all on function public.temp_mail_reserve_send(uuid) from public, anon, authenticated;
grant execute on function public.temp_mail_reserve_send(uuid) to service_role;
