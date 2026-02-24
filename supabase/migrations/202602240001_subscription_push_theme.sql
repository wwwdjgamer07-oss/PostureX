do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_status') then
    create type public.plan_status as enum ('active', 'expired');
  end if;
end
$$;

alter table public.users
add column if not exists plan_type text not null default 'free',
add column if not exists plan_start timestamptz,
add column if not exists plan_end timestamptz,
add column if not exists plan_status public.plan_status not null default 'expired',
add column if not exists subscription_active boolean not null default false;

update public.users
set plan_type = case
  when plan_tier = 'PRO' then 'pro_month'
  when plan_tier = 'BASIC' then 'pro_month'
  else 'free'
end
where plan_type is null or plan_type = '';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id, created_at desc);

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions for update
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

create table if not exists public.user_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text not null default 'dark',
  colors jsonb not null default '{}'::jsonb,
  background_image text,
  card_image text,
  header_image text,
  accent_image text,
  avatar_image text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_themes_user on public.user_themes (user_id, created_at desc);
create unique index if not exists idx_user_themes_single_active on public.user_themes (user_id) where is_active = true;

drop trigger if exists user_themes_updated_at on public.user_themes;
create trigger user_themes_updated_at
before update on public.user_themes
for each row execute function public.set_updated_at();

alter table public.user_themes enable row level security;

drop policy if exists "user_themes_select_own" on public.user_themes;
create policy "user_themes_select_own"
on public.user_themes for select
using (auth.uid() = user_id);

drop policy if exists "user_themes_insert_own" on public.user_themes;
create policy "user_themes_insert_own"
on public.user_themes for insert
with check (auth.uid() = user_id);

drop policy if exists "user_themes_update_own" on public.user_themes;
create policy "user_themes_update_own"
on public.user_themes for update
using (auth.uid() = user_id);

drop policy if exists "user_themes_delete_own" on public.user_themes;
create policy "user_themes_delete_own"
on public.user_themes for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('user-themes', 'user-themes', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "user_themes_bucket_select" on storage.objects;
create policy "user_themes_bucket_select"
on storage.objects for select
using (bucket_id = 'user-themes');

drop policy if exists "user_themes_bucket_insert" on storage.objects;
create policy "user_themes_bucket_insert"
on storage.objects for insert
with check (
  bucket_id = 'user-themes'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "user_themes_bucket_update" on storage.objects;
create policy "user_themes_bucket_update"
on storage.objects for update
using (
  bucket_id = 'user-themes'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "user_themes_bucket_delete" on storage.objects;
create policy "user_themes_bucket_delete"
on storage.objects for delete
using (
  bucket_id = 'user-themes'
  and auth.uid()::text = split_part(name, '/', 1)
);
