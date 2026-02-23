alter table public.users
add column if not exists email_reports_enabled boolean not null default true,
add column if not exists report_frequency text not null default 'weekly',
add column if not exists report_timezone text not null default 'UTC';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_report_frequency_check'
  ) then
    alter table public.users
      add constraint users_report_frequency_check
      check (report_frequency in ('daily', 'weekly', 'off'));
  end if;
end
$$;

create table if not exists public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period, period_start, period_end)
);

create index if not exists idx_report_deliveries_user_created
  on public.report_deliveries (user_id, created_at desc);

create index if not exists idx_report_deliveries_status
  on public.report_deliveries (status, created_at desc);

alter table public.report_deliveries enable row level security;

drop policy if exists "report_deliveries_select_own" on public.report_deliveries;
create policy "report_deliveries_select_own"
on public.report_deliveries for select
using (auth.uid() = user_id);

drop policy if exists "report_deliveries_insert_own" on public.report_deliveries;
create policy "report_deliveries_insert_own"
on public.report_deliveries for insert
with check (auth.uid() = user_id);

drop policy if exists "report_deliveries_update_own" on public.report_deliveries;
create policy "report_deliveries_update_own"
on public.report_deliveries for update
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists report_deliveries_updated_at on public.report_deliveries;
create trigger report_deliveries_updated_at
before update on public.report_deliveries
for each row execute function public.set_updated_at();
