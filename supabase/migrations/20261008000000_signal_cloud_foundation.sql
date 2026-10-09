-- Signal cloud foundation. Firebase Auth remains the identity provider.
-- Apply this migration to the Supabase project after configuring Firebase third-party auth.

create table if not exists public.profiles (
    id text primary key,
    email text,
    display_name text,
    photo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.preserve_profile_created_at()
returns trigger
language plpgsql
as $$
begin
    new.created_at := old.created_at;
    return new;
end;
$$;

create trigger profiles_preserve_created_at
before update on public.profiles
for each row execute function public.preserve_profile_created_at();

create table if not exists public.memories (
    id text primary key,
    user_id text not null,
    title text not null,
    content text not null,
    source_url text,
    source_type text not null,
    summary text not null default '',
    keywords text not null default '',
    capture_location text not null default '',
    target_location text not null default '',
    target_latitude double precision,
    target_longitude double precision,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists memories_user_created_at_idx
    on public.memories (user_id, created_at desc);

create table if not exists public.subscriptions (
    user_id text primary key,
    plan text not null,
    status text not null,
    started_at timestamptz,
    expires_at timestamptz,
    provider text,
    provider_purchase_id text,
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.subscriptions enable row level security;

-- Supabase hosted third-party auth validates registered Firebase projects too;
-- keep the project issuer/audience check explicit as defense in depth.
create or replace function public.is_signal_firebase_jwt()
returns boolean
language sql
stable
as $$
    select auth.jwt() ->> 'iss' = 'https://securetoken.google.com/com-example-signal-d63fc'
       and auth.jwt() ->> 'aud' = 'com-example-signal-d63fc'
$$;
revoke all on function public.is_signal_firebase_jwt() from public;
grant execute on function public.is_signal_firebase_jwt() to authenticated;

create policy "profiles_select_own"
    on public.profiles for select to authenticated
    using (public.is_signal_firebase_jwt() and id = (auth.jwt() ->> 'sub'));
create policy "profiles_insert_own"
    on public.profiles for insert to authenticated
    with check (public.is_signal_firebase_jwt() and id = (auth.jwt() ->> 'sub'));
create policy "profiles_update_own"
    on public.profiles for update to authenticated
    using (public.is_signal_firebase_jwt() and id = (auth.jwt() ->> 'sub'))
    with check (public.is_signal_firebase_jwt() and id = (auth.jwt() ->> 'sub'));

create policy "memories_select_own"
    on public.memories for select to authenticated
    using (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'));
create policy "memories_insert_own"
    on public.memories for insert to authenticated
    with check (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'));
create policy "memories_update_own"
    on public.memories for update to authenticated
    using (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'))
    with check (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'));
create policy "memories_delete_own"
    on public.memories for delete to authenticated
    using (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'));

-- Subscription rows are visible to their owner, but only trusted server credentials may write them.
create policy "subscriptions_select_own"
    on public.subscriptions for select to authenticated
    using (public.is_signal_firebase_jwt() and user_id = (auth.jwt() ->> 'sub'));

revoke all on public.profiles, public.memories, public.subscriptions from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.memories to authenticated;
grant select on public.subscriptions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-images', 'memory-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false;

create policy "memory_images_select_own"
    on storage.objects for select to authenticated
    using (public.is_signal_firebase_jwt() and bucket_id = 'memory-images' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "memory_images_insert_own"
    on storage.objects for insert to authenticated
    with check (public.is_signal_firebase_jwt() and bucket_id = 'memory-images' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "memory_images_update_own"
    on storage.objects for update to authenticated
    using (public.is_signal_firebase_jwt() and bucket_id = 'memory-images' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'))
    with check (public.is_signal_firebase_jwt() and bucket_id = 'memory-images' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "memory_images_delete_own"
    on storage.objects for delete to authenticated
    using (public.is_signal_firebase_jwt() and bucket_id = 'memory-images' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
