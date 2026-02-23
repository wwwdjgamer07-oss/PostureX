alter table public.users
add column if not exists daily_reminder_enabled boolean not null default true;

