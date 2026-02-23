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
#variable_conflict use_column
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
      from public.sessions as s
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
      from public.sessions as s
      where s.user_id = $1
        and (s.created_at at time zone 'utc')::date = $2
    $q$
    into v_avg_score, v_total_sessions, v_total_duration
    using p_user_id, v_today;
  end if;

  insert into public.daily_metrics as dm ("user_id", "date", avg_score, total_sessions, total_duration)
  values (p_user_id, v_today, v_avg_score, v_total_sessions, v_total_duration)
  on conflict ("user_id", "date") do update
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
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row public.user_streaks%rowtype;
  v_today_active boolean := false;
  v_gap integer := 0;
begin
  select coalesce(sum(s.duration_seconds), 0) >= 180
  into v_today_active
  from public.sessions s
  where s.user_id = p_user_id
    and (s.started_at at time zone 'utc')::date = v_today;

  select *
  into v_row
  from public.user_streaks us
  where us.user_id = p_user_id
  for update;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_active_date, updated_at)
    values (
      p_user_id,
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
    where public.user_streaks.user_id = p_user_id
    returning *
    into v_row;
  else
    v_row.updated_at := now();
    update public.user_streaks
    set updated_at = v_row.updated_at
    where public.user_streaks.user_id = p_user_id
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
