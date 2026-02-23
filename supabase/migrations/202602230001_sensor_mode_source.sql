do $$
begin
  if not exists (select 1 from pg_type where typname = 'posture_source') then
    create type public.posture_source as enum ('camera', 'sensor');
  end if;
end
$$;

alter table public.sessions
add column if not exists source public.posture_source not null default 'camera';

alter table public.posture_records
add column if not exists source public.posture_source not null default 'camera';

create index if not exists idx_sessions_user_source_started
  on public.sessions (user_id, source, started_at desc);

create index if not exists idx_posture_records_session_source_time
  on public.posture_records (session_id, source, captured_at desc);

