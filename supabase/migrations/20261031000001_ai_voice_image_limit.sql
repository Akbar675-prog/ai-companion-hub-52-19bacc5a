-- Naikkan batas image_data agar upload file gambar maksimal 50 MB
-- (data URL dapat lebih besar daripada ukuran file aslinya).

do $$
begin
  if to_regclass('public.ai_voice_agents') is not null then
    alter table public.ai_voice_agents
      drop constraint if exists ai_voice_agents_image_data_check;

    alter table public.ai_voice_agents
      add constraint ai_voice_agents_image_data_check
      check (char_length(image_data) <= 70000000);
  end if;
end
$$;
