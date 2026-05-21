create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  operation text not null check (operation in ('create', 'update', 'delete')),
  table_name text not null,
  record_id text not null,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  source text not null,
  request_context jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_record_idx
  on public.audit_logs (table_name, record_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_user_id, created_at desc);

alter table public.audit_logs enable row level security;

comment on table public.audit_logs is
  'Append-only audit trail for frontend-requested database changes.';

comment on column public.audit_logs.source is
  'Edge function or backend workflow that performed the database change.';
