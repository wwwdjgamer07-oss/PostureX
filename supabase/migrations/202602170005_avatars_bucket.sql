-- Create avatars storage bucket if missing.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Allow public read for avatar files.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
using (bucket_id = 'avatars');

-- Allow users to upload only their own avatar at avatars/public/{userId}.png
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name = ('public/' || auth.uid()::text || '.png')
);

-- Allow users to update only their own avatar object.
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name = ('public/' || auth.uid()::text || '.png')
)
with check (
  bucket_id = 'avatars'
  and name = ('public/' || auth.uid()::text || '.png')
);

-- Allow users to delete only their own avatar object.
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name = ('public/' || auth.uid()::text || '.png')
);
