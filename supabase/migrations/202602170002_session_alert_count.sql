alter table public.sessions
add column if not exists alert_count integer not null default 0;
