create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('FREE', 'PRO', 'ENTERPRISE');
  end if;

  if not exists (select 1 from pg_type where typname = 'risk_level') then
    create type public.risk_level as enum ('LOW', 'MODERATE', 'HIGH', 'SEVERE', 'CRITICAL');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'USER',
  plan_tier public.plan_tier not null default 'FREE',
  demo_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  avg_alignment numeric(5,2) default 0,
  avg_symmetry numeric(5,2) default 0,
  avg_stability numeric(5,2) default 0,
  avg_fatigue numeric(5,2) default 0,
  peak_risk public.risk_level not null default 'LOW',
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posture_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  captured_at timestamptz not null default now(),
  alignment numeric(5,2) not null,
  symmetry numeric(5,2) not null,
  stability numeric(5,2) not null,
  fatigue numeric(5,2) not null,
  score numeric(5,2) not null,
  risk_level public.risk_level not null
);

create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  level public.risk_level not null,
  alignment numeric(5,2) not null,
  symmetry numeric(5,2) not null,
  stability numeric(5,2) not null,
  fatigue numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_tier public.plan_tier not null default 'FREE',
  billing_interval text,
  status text not null default 'inactive',
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan text,
  amount_inr integer,
  payment_method text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  message text,
  type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_created on public.sessions (user_id, created_at desc);
create index if not exists idx_posture_records_session_time on public.posture_records (session_id, captured_at desc);
create index if not exists idx_risk_events_user_time on public.risk_events (user_id, created_at desc);
create index if not exists idx_analytics_events_time on public.analytics_events (created_at desc);
create index if not exists idx_payments_user_created on public.payments (user_id, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.posture_records enable row level security;
alter table public.risk_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users_select_self" on public.users;
create policy "users_select_self"
on public.users for select
using (auth.uid() = id);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
on public.users for update
using (auth.uid() = id);

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions for select
using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions for update
using (auth.uid() = user_id);

drop policy if exists "records_select_own" on public.posture_records;
create policy "records_select_own"
on public.posture_records for select
using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.posture_records;
create policy "records_insert_own"
on public.posture_records for insert
with check (auth.uid() = user_id);

drop policy if exists "risk_events_select_own" on public.risk_events;
create policy "risk_events_select_own"
on public.risk_events for select
using (auth.uid() = user_id);

drop policy if exists "risk_events_insert_own" on public.risk_events;
create policy "risk_events_insert_own"
on public.risk_events for insert
with check (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions for update
using (auth.uid() = user_id);

drop policy if exists "analytics_select_own" on public.analytics_events;
create policy "analytics_select_own"
on public.analytics_events for select
using (auth.uid() = user_id);

drop policy if exists "analytics_insert_own" on public.analytics_events;
create policy "analytics_insert_own"
on public.analytics_events for insert
with check (auth.uid() = user_id);

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
on public.payments for select
using (auth.uid() = user_id);

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
on public.payments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can see own notifications" on public.notifications;
create policy "Users can see own notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Insert own notifications" on public.notifications;
create policy "Insert own notifications"
on public.notifications for insert
with check (auth.uid() = user_id);

drop policy if exists "Update own notifications" on public.notifications;
create policy "Update own notifications"
on public.notifications for update
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
