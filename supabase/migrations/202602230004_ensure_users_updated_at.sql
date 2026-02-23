-- Ensure users.updated_at exists for admin/live dashboards and profile metadata.
alter table public.users
  add column if not exists updated_at timestamptz;

update public.users
set updated_at = coalesce(updated_at, now())
where updated_at is null;

alter table public.users
  alter column updated_at set default now();

alter table public.users
  alter column updated_at set not null;

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

notify pgrst, 'reload schema';
