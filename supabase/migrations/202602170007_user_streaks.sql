create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_streaks_updated_at on public.user_streaks (updated_at desc);

alter table public.user_streaks enable row level security;

drop policy if exists "user_streaks_select_own" on public.user_streaks;
create policy "user_streaks_select_own"
on public.user_streaks for select
using (auth.uid() = user_id);

drop policy if exists "user_streaks_insert_own" on public.user_streaks;
create policy "user_streaks_insert_own"
on public.user_streaks for insert
with check (auth.uid() = user_id);

drop policy if exists "user_streaks_update_own" on public.user_streaks;
create policy "user_streaks_update_own"
on public.user_streaks for update
using (auth.uid() = user_id);

create or replace function public.update_user_streak(p_user_id uuid)
returns table (
  user_id uuid,
  current_streak integer,
  longest_streak integer,
  last_active_date date,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row public.user_streaks%rowtype;
  v_today_active boolean := false;
  v_gap integer := 0;
begin
  select coalesce(sum(s.duration_seconds), 0) >= 180
  into v_today_active
  from public.sessions s
  where s.user_id = update_user_streak.p_user_id
    and (s.started_at at time zone 'utc')::date = v_today;

  select *
  into v_row
  from public.user_streaks us
  where us.user_id = update_user_streak.p_user_id
  for update;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_active_date, updated_at)
    values (
      update_user_streak.p_user_id,
      case when v_today_active then 1 else 0 end,
      case when v_today_active then 1 else 0 end,
      case when v_today_active then v_today else null end,
      now()
    )
    returning *
    into v_row;
  elsif v_today_active then
    if v_row.last_active_date is null then
      v_row.current_streak := 1;
    elsif v_row.last_active_date = v_today then
      v_row.current_streak := greatest(v_row.current_streak, 1);
    else
      v_gap := v_today - v_row.last_active_date;
      if v_gap = 1 then
        v_row.current_streak := greatest(v_row.current_streak, 0) + 1;
      else
        v_row.current_streak := 1;
      end if;
    end if;

    v_row.longest_streak := greatest(v_row.longest_streak, v_row.current_streak);
    v_row.last_active_date := v_today;
    v_row.updated_at := now();

    update public.user_streaks
    set
      current_streak = v_row.current_streak,
      longest_streak = v_row.longest_streak,
      last_active_date = v_row.last_active_date,
      updated_at = v_row.updated_at
    where public.user_streaks.user_id = update_user_streak.p_user_id
    returning *
    into v_row;
  else
    v_row.updated_at := now();
    update public.user_streaks
    set updated_at = v_row.updated_at
    where public.user_streaks.user_id = update_user_streak.p_user_id
    returning *
    into v_row;
  end if;

  return query
  select
    v_row.user_id,
    v_row.current_streak,
    v_row.longest_streak,
    v_row.last_active_date,
    v_row.updated_at;
end;
$$;

grant execute on function public.update_user_streak(uuid) to authenticated;
