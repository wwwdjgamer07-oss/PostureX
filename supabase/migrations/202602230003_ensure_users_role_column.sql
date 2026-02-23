-- Ensure users.role exists for admin role switch and settings UI.
alter table public.users
  add column if not exists role text;

update public.users
set role = 'USER'
where role is null;

alter table public.users
  alter column role set default 'USER';

alter table public.users
  alter column role set not null;

-- Reload PostgREST schema cache so API sees new column immediately.
notify pgrst, 'reload schema';
