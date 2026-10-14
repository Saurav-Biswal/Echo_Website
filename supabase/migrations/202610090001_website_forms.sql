create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254),
  name text check (name is null or char_length(name) <= 100),
  use_case text check (use_case is null or char_length(use_case) <= 600),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  name text check (name is null or char_length(name) <= 100),
  subject text not null,
  message text not null check (char_length(message) <= 3000),
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
alter table public.contact_messages enable row level security;
revoke all on public.waitlist_signups from anon, authenticated;
revoke all on public.contact_messages from anon, authenticated;
grant insert on public.waitlist_signups to service_role;
grant insert on public.contact_messages to service_role;
