create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  avg_score numeric(5,2) not null default 0,
  total_sessions integer not null default 0,
  total_duration integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_metrics_user_date on public.daily_metrics (user_id, date desc);

alter table public.daily_metrics enable row level security;

drop policy if exists "daily_metrics_select_own" on public.daily_metrics;
create policy "daily_metrics_select_own"
on public.daily_metrics for select
using (auth.uid() = user_id);

drop policy if exists "daily_metrics_insert_own" on public.daily_metrics;
create policy "daily_metrics_insert_own"
on public.daily_metrics for insert
with check (auth.uid() = user_id);

drop policy if exists "daily_metrics_update_own" on public.daily_metrics;
create policy "daily_metrics_update_own"
on public.daily_metrics for update
using (auth.uid() = user_id);

create or replace function public.update_daily_metrics(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  date date,
  avg_score numeric,
  total_sessions integer,
  total_duration integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_avg_score numeric(5,2) := 0;
  v_total_sessions integer := 0;
  v_total_duration integer := 0;
  v_has_score_column boolean := false;
  v_row public.daily_metrics%rowtype;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'score'
  )
  into v_has_score_column;

  if v_has_score_column then
    execute $q$
      select
        coalesce(avg(s.score), 0)::numeric(5,2),
        count(*)::int,
        coalesce(sum(s.duration_seconds), 0)::int
      from public.sessions s
      where s.user_id = $1
        and (s.created_at at time zone 'utc')::date = $2
    $q$
    into v_avg_score, v_total_sessions, v_total_duration
    using p_user_id, v_today;
  else
    execute $q$
      select
        coalesce(avg(s.avg_alignment), 0)::numeric(5,2),
        count(*)::int,
        coalesce(sum(s.duration_seconds), 0)::int
      from public.sessions s
      where s.user_id = $1
        and (s.created_at at time zone 'utc')::date = $2
    $q$
    into v_avg_score, v_total_sessions, v_total_duration
    using p_user_id, v_today;
  end if;

  insert into public.daily_metrics (user_id, date, avg_score, total_sessions, total_duration)
  values (p_user_id, v_today, v_avg_score, v_total_sessions, v_total_duration)
  on conflict (user_id, date) do update
  set
    avg_score = excluded.avg_score,
    total_sessions = excluded.total_sessions,
    total_duration = excluded.total_duration
  returning *
  into v_row;

  return query
  select
    v_row.id,
    v_row.user_id,
    v_row.date,
    v_row.avg_score,
    v_row.total_sessions,
    v_row.total_duration,
    v_row.created_at;
end;
$$;

grant execute on function public.update_daily_metrics(uuid) to authenticated;

