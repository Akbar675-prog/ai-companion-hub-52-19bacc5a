-- Jalankan sekali di Supabase SQL Editor.
-- Menambahkan pengaturan prompt uncensored pada katalog AI.

alter table public.ai_models
  add column if not exists uncensored boolean not null default false;

-- Opsional: verifikasi kolom sudah tersedia.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_models'
  and column_name = 'uncensored';
