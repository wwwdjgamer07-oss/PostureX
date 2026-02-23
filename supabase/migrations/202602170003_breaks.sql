create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  duration_sec integer not null default 120,
  taken boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_breaks_user_created on public.breaks (user_id, created_at desc);

alter table public.breaks enable row level security;

drop policy if exists "breaks_select_own" on public.breaks;
create policy "breaks_select_own"
on public.breaks for select
using (auth.uid() = user_id);

drop policy if exists "breaks_insert_own" on public.breaks;
create policy "breaks_insert_own"
on public.breaks for insert
with check (auth.uid() = user_id);
