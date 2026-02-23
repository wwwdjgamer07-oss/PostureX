-- Ensure avatars bucket exists and is public.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = true;

-- Ensure RLS is enabled on storage objects.
alter table storage.objects enable row level security;

-- Replace previous avatars policies safely.
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

-- Public read access for avatars.
create policy "avatars_public_read"
on storage.objects
for select
to public
using (
  bucket_id = 'avatars'
);

-- Authenticated users can insert only their own avatar file: {user_id}.png
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '.', 1)
);

-- Authenticated users can update only their own avatar file.
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '.', 1)
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '.', 1)
);

-- Authenticated users can delete only their own avatar file.
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '.', 1)
);

