alter table public.ai_models
  add column if not exists uncensored boolean not null default false;
