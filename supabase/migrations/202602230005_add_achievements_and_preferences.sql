create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dark_mode boolean not null default true,
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text not null default '??',
  created_at timestamptz not null default now()
);

create index if not exists idx_achievements_user_created on public.achievements (user_id, created_at desc);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_preferences') then
    alter table public.user_preferences enable row level security;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'achievements') then
    alter table public.achievements enable row level security;
  end if;
end
$$;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
on public.user_preferences for select
using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
on public.user_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
on public.user_preferences for update
using (auth.uid() = user_id);

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own"
on public.achievements for select
using (auth.uid() = user_id);

drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own"
on public.achievements for insert
with check (auth.uid() = user_id);

drop policy if exists "achievements_update_own" on public.achievements;
create policy "achievements_update_own"
on public.achievements for update
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
