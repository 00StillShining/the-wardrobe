-- 0002_rls_policies.sql
-- Row Level Security + private storage buckets (plan §10.5).
--
-- Rules implemented:
--   * A user can select / insert / update / delete only rows they own.
--   * Child rows validate ownership through their parent AND their own
--     user_id where the column exists (item_images, board_elements).
--   * Pure join tables (outfit_items, wear_event_items) have no user_id and
--     validate through BOTH parents.
--   * Storage: three private buckets ('originals', 'derivatives', 'exports');
--     every object path must start with the owner's auth user id
--     ('<user_id>/...'), enforced on read, write, update and delete.
--   * No policy grants service-role anything extra: service role bypasses
--     RLS by design and must exist only in trusted server code.
--
-- NOT verified against a live database yet (no local Postgres available).
-- Run scripts/rls-verify.mjs against a real project with two test users
-- before trusting these policies (plan §10.5). See supabase/README.md.

-- ---------------------------------------------------------------------------
-- Enable RLS on every table. With RLS enabled and no matching policy, all
-- access is denied by default (fail closed).
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.item_images enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.style_boards enable row level security;
alter table public.board_elements enable row level security;
alter table public.wear_events enable row level security;
alter table public.wear_event_items enable row level security;
alter table public.import_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — the row id IS the auth user id.
-- ---------------------------------------------------------------------------

-- A user can read only their own profile row.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

-- A user can create only the profile row whose id is their own auth id.
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

-- A user can update only their own profile, and cannot re-point it at
-- another user (with check re-validates the row after the update).
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- A user can delete only their own profile row (account deletion path).
create policy profiles_delete_own on public.profiles
  for delete using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- wardrobe_items — plain per-user ownership via user_id.
-- ---------------------------------------------------------------------------

-- Read own garments only.
create policy wardrobe_items_select_own on public.wardrobe_items
  for select using (user_id = auth.uid());

-- Insert only rows stamped with the caller's own user id.
create policy wardrobe_items_insert_own on public.wardrobe_items
  for insert with check (user_id = auth.uid());

-- Update own rows only; the updated row must still belong to the caller.
create policy wardrobe_items_update_own on public.wardrobe_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hard delete own rows only (ordinary removal is soft delete in app code).
create policy wardrobe_items_delete_own on public.wardrobe_items
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- item_images — child of wardrobe_items; has its own user_id.
-- Ownership is validated through the parent item AND the row's user_id
-- (plan §10.5: child rows validate both).
-- ---------------------------------------------------------------------------

-- Read image rows only when the caller owns both the row and the parent item.
create policy item_images_select_own on public.item_images
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Insert image rows only for the caller's own items, stamped with their id.
create policy item_images_insert_own on public.item_images
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Update own image rows only, and never re-point them at someone else's item.
create policy item_images_update_own on public.item_images
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Delete own image rows only.
create policy item_images_delete_own on public.item_images
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- outfits — plain per-user ownership via user_id.
-- ---------------------------------------------------------------------------

-- Read own outfits only.
create policy outfits_select_own on public.outfits
  for select using (user_id = auth.uid());

-- Insert only outfits stamped with the caller's own user id.
create policy outfits_insert_own on public.outfits
  for insert with check (user_id = auth.uid());

-- Update own outfits only.
create policy outfits_update_own on public.outfits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Delete own outfits only.
create policy outfits_delete_own on public.outfits
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- outfit_items — pure join table (no user_id). Ownership is validated
-- through BOTH parents: the outfit and the garment must belong to the caller.
-- ---------------------------------------------------------------------------

-- Read rows only for outfits the caller owns.
create policy outfit_items_select_own on public.outfit_items
  for select using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

-- Link only the caller's own garment into the caller's own outfit; prevents
-- referencing another user's item id even when the outfit is owned.
create policy outfit_items_insert_own on public.outfit_items
  for insert with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Update (re-slot, re-order, re-compose) only within the caller's own
-- outfit, and the row must still reference the caller's own outfit and item.
create policy outfit_items_update_own on public.outfit_items
  for update using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Unlink rows only from the caller's own outfits.
create policy outfit_items_delete_own on public.outfit_items
  for delete using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- style_boards — plain per-user ownership via user_id.
-- ---------------------------------------------------------------------------

-- Read own boards only.
create policy style_boards_select_own on public.style_boards
  for select using (user_id = auth.uid());

-- Insert only boards stamped with the caller's own user id.
create policy style_boards_insert_own on public.style_boards
  for insert with check (user_id = auth.uid());

-- Update own boards only.
create policy style_boards_update_own on public.style_boards
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Delete own boards only.
create policy style_boards_delete_own on public.style_boards
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- board_elements — child of style_boards; has its own user_id.
-- Validated through the parent board AND the row's user_id; an optional
-- item reference must also point at the caller's own garment.
-- ---------------------------------------------------------------------------

-- Read elements only on the caller's own boards.
create policy board_elements_select_own on public.board_elements
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from public.style_boards b
      where b.id = board_id and b.user_id = auth.uid()
    )
  );

-- Insert elements only on the caller's own boards, stamped with their id;
-- an item element may only reference the caller's own garment.
create policy board_elements_insert_own on public.board_elements
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.style_boards b
      where b.id = board_id and b.user_id = auth.uid()
    )
    and (
      item_id is null
      or exists (
        select 1 from public.wardrobe_items i
        where i.id = item_id and i.user_id = auth.uid()
      )
    )
  );

-- Update own elements only; the row must still sit on the caller's own board
-- and reference only the caller's own garment.
create policy board_elements_update_own on public.board_elements
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.style_boards b
      where b.id = board_id and b.user_id = auth.uid()
    )
    and (
      item_id is null
      or exists (
        select 1 from public.wardrobe_items i
        where i.id = item_id and i.user_id = auth.uid()
      )
    )
  );

-- Delete own elements only.
create policy board_elements_delete_own on public.board_elements
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- wear_events — plain per-user ownership; an optional outfit reference must
-- point at the caller's own outfit.
-- ---------------------------------------------------------------------------

-- Read own wear events only.
create policy wear_events_select_own on public.wear_events
  for select using (user_id = auth.uid());

-- Insert only events stamped with the caller's id; a linked outfit must be
-- the caller's own.
create policy wear_events_insert_own on public.wear_events
  for insert with check (
    user_id = auth.uid()
    and (
      outfit_id is null
      or exists (
        select 1 from public.outfits o
        where o.id = outfit_id and o.user_id = auth.uid()
      )
    )
  );

-- Update own events only, keeping any outfit reference within the caller's
-- own outfits.
create policy wear_events_update_own on public.wear_events
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
    and (
      outfit_id is null
      or exists (
        select 1 from public.outfits o
        where o.id = outfit_id and o.user_id = auth.uid()
      )
    )
  );

-- Delete own events only.
create policy wear_events_delete_own on public.wear_events
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- wear_event_items — pure join table (no user_id). Ownership validated
-- through BOTH parents: the wear event and the garment.
-- ---------------------------------------------------------------------------

-- Read rows only for the caller's own wear events.
create policy wear_event_items_select_own on public.wear_event_items
  for select using (
    exists (
      select 1 from public.wear_events e
      where e.id = wear_event_id and e.user_id = auth.uid()
    )
  );

-- Link only the caller's own garment to the caller's own wear event.
create policy wear_event_items_insert_own on public.wear_event_items
  for insert with check (
    exists (
      select 1 from public.wear_events e
      where e.id = wear_event_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Update rows only within the caller's own events, and the row must still
-- reference the caller's own event and item.
create policy wear_event_items_update_own on public.wear_event_items
  for update using (
    exists (
      select 1 from public.wear_events e
      where e.id = wear_event_id and e.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.wear_events e
      where e.id = wear_event_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.wardrobe_items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Unlink rows only from the caller's own wear events.
create policy wear_event_items_delete_own on public.wear_event_items
  for delete using (
    exists (
      select 1 from public.wear_events e
      where e.id = wear_event_id and e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- import_jobs — plain per-user ownership via user_id.
-- ---------------------------------------------------------------------------

-- Read own import jobs only.
create policy import_jobs_select_own on public.import_jobs
  for select using (user_id = auth.uid());

-- Insert only jobs stamped with the caller's own user id.
create policy import_jobs_insert_own on public.import_jobs
  for insert with check (user_id = auth.uid());

-- Update own jobs only (status transitions, progress, results).
create policy import_jobs_update_own on public.import_jobs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Delete own jobs only (cancel-and-cleanup path).
create policy import_jobs_delete_own on public.import_jobs
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage buckets — all PRIVATE (public = false). Objects are only ever
-- reachable through authenticated, policy-checked requests or short-lived
-- signed URLs created by the owner.
--
--   originals    — untouched uploaded photos ('<user_id>/items/<uuid>.<ext>')
--   derivatives  — cutouts, display WebPs, thumbnails
--   exports      — rendered board/outfit exports
--
-- Path convention: the FIRST path segment is the owner's auth user id.
-- storage.foldername(name) returns the path segments before the file name,
-- so (storage.foldername(name))[1] is that first segment.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('originals', 'originals', false),
  ('derivatives', 'derivatives', false),
  ('exports', 'exports', false)
on conflict (id) do nothing;

-- Read objects only inside the caller's own top-level folder. This also
-- gates listing: rows outside the caller's prefix are invisible.
create policy storage_objects_select_own on storage.objects
  for select using (
    bucket_id in ('originals', 'derivatives', 'exports')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Upload only into the caller's own top-level folder in the app buckets.
create policy storage_objects_insert_own on storage.objects
  for insert with check (
    bucket_id in ('originals', 'derivatives', 'exports')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Move/overwrite only within the caller's own folder — both the existing
-- row (using) and the resulting row (with check) must stay under it.
create policy storage_objects_update_own on storage.objects
  for update using (
    bucket_id in ('originals', 'derivatives', 'exports')
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id in ('originals', 'derivatives', 'exports')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete only objects inside the caller's own folder.
create policy storage_objects_delete_own on storage.objects
  for delete using (
    bucket_id in ('originals', 'derivatives', 'exports')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
