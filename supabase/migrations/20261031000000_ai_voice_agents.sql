-- Voice agent milik pengguna untuk ElevenLabs TTS.
-- Jalankan di project Supabase DATA/BASE (yang dipakai SUPABASE_URL / DATA_SUPABASE_URL),
-- bukan project Supabase AUTH.

create table if not exists public.ai_voice_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  voice_id text not null check (voice_id ~ '^[A-Za-z0-9_-]{8,80}$'),
  name text not null check (char_length(name) between 1 and 60),
  image_data text not null default '' check (char_length(image_data) <= 70000000),
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, voice_id)
);

create index if not exists ai_voice_agents_user_id_idx
  on public.ai_voice_agents (user_id);

create unique index if not exists ai_voice_agents_one_selected_per_user
  on public.ai_voice_agents (user_id)
  where is_selected = true;

alter table public.ai_voice_agents enable row level security;

-- The application uses the server-side service-role client after account auth.
revoke all on public.ai_voice_agents from anon, authenticated;
grant all on public.ai_voice_agents to service_role;

create or replace function public.ai_voice_agents_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_voice_agents_updated_at on public.ai_voice_agents;
create trigger ai_voice_agents_updated_at
before update on public.ai_voice_agents
for each row execute function public.ai_voice_agents_set_updated_at();

create or replace function public.ai_voice_agents_select_one()
returns trigger
language plpgsql
as $$
begin
  if new.is_selected then
    update public.ai_voice_agents
    set is_selected = false
    where user_id = new.user_id
      and id <> new.id
      and is_selected = true;
  end if;
  return new;
end;
$$;

drop trigger if exists ai_voice_agents_select_one on public.ai_voice_agents;
create trigger ai_voice_agents_select_one
before insert or update of is_selected, user_id on public.ai_voice_agents
for each row execute function public.ai_voice_agents_select_one();
