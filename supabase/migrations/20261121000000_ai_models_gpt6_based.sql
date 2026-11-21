alter table public.ai_models
  add column if not exists gpt6_based boolean not null default false;
