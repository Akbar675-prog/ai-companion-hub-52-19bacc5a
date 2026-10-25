-- Run this once in the Supabase SQL Editor for project dbgoikwdeaxpddcukzgg.
-- The app creates and reads tickets only from server code using the service role.
-- File uploads use short-lived signed upload tokens; the bucket stays private.

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 3 and 150),
  message text not null check (char_length(message) between 10 and 5000),
  attachments jsonb not null default '[]'::jsonb
    check (
      case
        when jsonb_typeof(attachments) = 'array'
          then jsonb_array_length(attachments) <= 10
        else false
      end
    ),
  status text not null default 'pending_upload'
    check (status in ('pending_upload', 'open', 'in_progress', 'resolved', 'closed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep this script safe to re-run if the earlier ticket table was already created.
alter table public.issue_reports add column if not exists user_id uuid;
alter table public.issue_reports add column if not exists admin_note text not null default '';
alter table public.issue_reports add column if not exists updated_at timestamptz not null default now();

create index if not exists issue_reports_user_id_created_at_idx
  on public.issue_reports (user_id, created_at desc);

create index if not exists issue_reports_created_at_idx
  on public.issue_reports (created_at desc);

alter table public.issue_reports enable row level security;
revoke all on table public.issue_reports from anon, authenticated;
grant all on table public.issue_reports to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'issue-report-files',
  'issue-report-files',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
