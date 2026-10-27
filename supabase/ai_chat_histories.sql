-- Jalankan di SQL Editor proyek BASE/DATA Supabase (bukan proyek AUTH).
-- Konten chat tidak disimpan sebagai plaintext. Enkripsi/dekripsi AES-256-GCM
-- dilakukan oleh server aplikasi menggunakan AI_HISTORY_ENCRYPTION_KEY.

create table if not exists public.ai_chat_histories (
  user_id uuid primary key,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_chat_histories_ciphertext_not_empty check (length(ciphertext) > 0),
  constraint ai_chat_histories_iv_not_empty check (length(iv) > 0),
  constraint ai_chat_histories_auth_tag_not_empty check (length(auth_tag) > 0)
);

alter table public.ai_chat_histories enable row level security;

-- Tidak ada policy SELECT/INSERT/UPDATE/DELETE untuk anon atau authenticated.
-- Hanya service role server aplikasi yang membaca dan menulis riwayat.
revoke all on table public.ai_chat_histories from anon, authenticated;
grant select, insert, update, delete on table public.ai_chat_histories to service_role;

create or replace function public.set_ai_chat_histories_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_chat_histories_updated_at on public.ai_chat_histories;
create trigger ai_chat_histories_updated_at
before update on public.ai_chat_histories
for each row execute function public.set_ai_chat_histories_updated_at();
