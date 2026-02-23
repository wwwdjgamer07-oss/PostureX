alter table public.sessions
add column if not exists break_taken boolean not null default false;
