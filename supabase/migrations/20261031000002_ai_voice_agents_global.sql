-- Jadikan katalog voice global seperti katalog AI di ai_models.
-- Semua pengguna dapat melihat voice yang sama; pilihan aktif tetap disimpan
-- per pengguna di profil AI masing-masing.

drop trigger if exists ai_voice_agents_select_one on public.ai_voice_agents;
drop function if exists public.ai_voice_agents_select_one();
drop index if exists public.ai_voice_agents_one_selected_per_user;

delete from public.ai_voice_agents a
using public.ai_voice_agents b
where a.voice_id = b.voice_id
  and a.id > b.id;

alter table public.ai_voice_agents
  drop constraint if exists ai_voice_agents_user_id_voice_id_key;

alter table public.ai_voice_agents
  drop constraint if exists ai_voice_agents_user_voice_id_key;

alter table public.ai_voice_agents
  drop column if exists user_id;

alter table public.ai_voice_agents
  add constraint ai_voice_agents_voice_id_key unique (voice_id);

update public.ai_voice_agents
set is_selected = false
where is_selected = true;
