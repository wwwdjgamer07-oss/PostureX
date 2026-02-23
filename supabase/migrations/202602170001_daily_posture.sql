create table if not exists public.daily_posture (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  avg_score numeric(5,2) not null default 0,
  sessions_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_posture_user_date on public.daily_posture (user_id, date desc);

alter table public.daily_posture enable row level security;

drop policy if exists "daily_posture_select_own" on public.daily_posture;
create policy "daily_posture_select_own"
on public.daily_posture for select
using (auth.uid() = user_id);

drop policy if exists "daily_posture_insert_own" on public.daily_posture;
create policy "daily_posture_insert_own"
on public.daily_posture for insert
with check (auth.uid() = user_id);

drop policy if exists "daily_posture_update_own" on public.daily_posture;
create policy "daily_posture_update_own"
on public.daily_posture for update
using (auth.uid() = user_id);
