-- 0001_initial_schema.sql
-- THE WARDROBE rebuild — initial relational schema (plan §10.4).
--
-- Conventions:
--   * UUID primary keys via gen_random_uuid() (built into Postgres 13+ / Supabase).
--   * created_at / updated_at on every table; updated_at maintained by trigger.
--   * user_id ownership on every top-level table, referencing auth.users.
--   * Soft deletion via deleted_at where the plan calls for it
--     (wardrobe_items, outfits, style_boards). Ordinary queries must
--     filter deleted_at IS NULL — enforced in the client repositories.
--   * Enum-like columns use CHECK constraints instead of Postgres enums so
--     values can be extended with a plain migration.
--
-- NOT verified against a live database yet: authored offline (no Docker /
-- Supabase CLI / psql on the authoring machine). See supabase/README.md.

-- ---------------------------------------------------------------------------
-- updated_at trigger function (shared by all tables)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user (plan §10.4 profiles)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  default_currency text not null default 'GBP'
    check (char_length(default_currency) = 3),
  locale text not null default 'en-GB',
  reduced_motion boolean not null default false,
  quality_preference text not null default 'auto'
    check (quality_preference in ('auto', 'high', 'medium', 'low')),
  default_collection_view text not null default 'rail'
    check (default_collection_view in ('rail', 'grid')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wardrobe_items — the core garment record (plan §9.4 / §10.4)
-- ---------------------------------------------------------------------------

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  category text not null,
  subcategory text,
  -- Garment template / 3D layer type used by the scene and outfit layering.
  layer_type text not null,
  ownership_status text not null default 'owned'
    check (ownership_status in ('owned', 'wishlist', 'archived')),
  size text,
  primary_color text,
  -- Extracted colour palette; JSON array of hex strings.
  palette jsonb not null default '[]'::jsonb
    check (jsonb_typeof(palette) = 'array'),
  seasons text[] not null default '{}',
  occasions text[] not null default '{}',
  material_notes text,
  notes text,
  price_paid numeric(12, 2) check (price_paid is null or price_paid >= 0),
  currency text not null default 'GBP' check (char_length(currency) = 3),
  purchased_at date,
  merchant text,
  product_url text,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'camera', 'url', 'receipt', 'email', 'import')),
  last_worn_at timestamptz,
  -- Cached count; must stay derivable from wear_event_items.
  wear_count integer not null default 0 check (wear_count >= 0),
  -- Image-pipeline status for the item as a whole ('none' = no photo yet).
  processing_status text not null default 'none'
    check (processing_status in ('none', 'pending', 'processing', 'ready', 'failed')),
  -- Optimistic-concurrency token; clients send the version they read and the
  -- update only applies when it still matches.
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger wardrobe_items_set_updated_at
  before update on public.wardrobe_items
  for each row execute function public.set_updated_at();

create index wardrobe_items_user_idx on public.wardrobe_items (user_id);
create index wardrobe_items_user_ownership_idx
  on public.wardrobe_items (user_id, ownership_status);
create index wardrobe_items_user_category_idx
  on public.wardrobe_items (user_id, category);
create index wardrobe_items_user_last_worn_idx
  on public.wardrobe_items (user_id, last_worn_at desc nulls last);
-- Fast path for the common "everything not soft-deleted" listing.
create index wardrobe_items_user_live_idx
  on public.wardrobe_items (user_id, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- item_images — original / cutout / display / thumbnail records (plan §10.4)
-- ---------------------------------------------------------------------------

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.wardrobe_items (id) on delete cascade,
  kind text not null
    check (kind in ('original', 'cutout', 'display', 'thumbnail')),
  storage_path text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes bigint check (bytes is null or bytes >= 0),
  processing_version integer not null default 1 check (processing_version >= 1),
  status text not null default 'ready'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger item_images_set_updated_at
  before update on public.item_images
  for each row execute function public.set_updated_at();

create index item_images_user_idx on public.item_images (user_id);
create index item_images_item_idx on public.item_images (item_id);

-- ---------------------------------------------------------------------------
-- outfits + outfit_items (plan §10.4)
-- ---------------------------------------------------------------------------

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  occasion text,
  season text,
  notes text,
  planned_for date,
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger outfits_set_updated_at
  before update on public.outfits
  for each row execute function public.set_updated_at();

create index outfits_user_idx on public.outfits (user_id);

-- Join table: no user_id of its own (plan lists none); ownership is validated
-- through BOTH parents in RLS (see 0002).
create table public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.wardrobe_items (id) on delete cascade,
  layer_slot text not null,
  sort_order integer not null default 0,
  -- Optional composition values, normalized to the canvas (0..1 for x/y).
  position_x real check (position_x is null or (position_x >= 0 and position_x <= 1)),
  position_y real check (position_y is null or (position_y >= 0 and position_y <= 1)),
  scale real check (scale is null or scale > 0),
  rotation real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outfit_id, item_id)
);

create trigger outfit_items_set_updated_at
  before update on public.outfit_items
  for each row execute function public.set_updated_at();

-- unique (outfit_id, item_id) already indexes outfit_id lookups.
create index outfit_items_item_idx on public.outfit_items (item_id);

-- ---------------------------------------------------------------------------
-- style_boards + board_elements (plan §10.4)
-- ---------------------------------------------------------------------------

create table public.style_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  -- Version of the board document format, for forward migration of payloads.
  document_version integer not null default 1 check (document_version >= 1),
  canvas_width integer not null check (canvas_width > 0),
  canvas_height integer not null check (canvas_height > 0),
  cover_image_path text,
  export_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger style_boards_set_updated_at
  before update on public.style_boards
  for each row execute function public.set_updated_at();

create index style_boards_user_idx on public.style_boards (user_id);

create table public.board_elements (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.style_boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Element kind ('item', 'media', 'caption', 'swatch', ...). Not CHECKed so
  -- new editor element kinds do not need a migration; the style payload is
  -- validated by kind in the application schema layer.
  kind text not null,
  -- Normalized transform (x/y are 0..1 of the canvas).
  position_x real not null default 0.5
    check (position_x >= 0 and position_x <= 1),
  position_y real not null default 0.5
    check (position_y >= 0 and position_y <= 1),
  scale real not null default 1 check (scale > 0),
  rotation real not null default 0,
  z_index integer not null default 0,
  locked boolean not null default false,
  hidden boolean not null default false,
  item_id uuid references public.wardrobe_items (id) on delete set null,
  media_path text,
  -- Kind-specific style payload; validated against a per-kind schema in app code.
  style jsonb not null default '{}'::jsonb
    check (jsonb_typeof(style) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger board_elements_set_updated_at
  before update on public.board_elements
  for each row execute function public.set_updated_at();

create index board_elements_user_idx on public.board_elements (user_id);
create index board_elements_board_idx on public.board_elements (board_id);
create index board_elements_item_idx on public.board_elements (item_id);

-- ---------------------------------------------------------------------------
-- wear_events + wear_event_items (plan §10.4)
-- ---------------------------------------------------------------------------

create table public.wear_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  worn_at timestamptz not null default now(),
  outfit_id uuid references public.outfits (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wear_events_set_updated_at
  before update on public.wear_events
  for each row execute function public.set_updated_at();

create index wear_events_user_idx on public.wear_events (user_id);
create index wear_events_user_worn_idx
  on public.wear_events (user_id, worn_at desc);
create index wear_events_outfit_idx on public.wear_events (outfit_id);

-- Join table for events not tied to one saved outfit; ownership validated
-- through both parents in RLS (see 0002).
create table public.wear_event_items (
  id uuid primary key default gen_random_uuid(),
  wear_event_id uuid not null references public.wear_events (id) on delete cascade,
  item_id uuid not null references public.wardrobe_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wear_event_id, item_id)
);

create trigger wear_event_items_set_updated_at
  before update on public.wear_event_items
  for each row execute function public.set_updated_at();

-- unique (wear_event_id, item_id) already indexes wear_event_id lookups.
create index wear_event_items_item_idx on public.wear_event_items (item_id);

-- ---------------------------------------------------------------------------
-- import_jobs — durable add/import pipeline state (plan §9.5 / §10.4)
-- ---------------------------------------------------------------------------

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'camera', 'url', 'receipt', 'email', 'import')),
  status text not null default 'created'
    check (status in (
      'created', 'uploading', 'queued', 'processing', 'review',
      'saving', 'complete', 'failed', 'cancelled'
    )),
  -- 0..100 whole-percent progress for the active stage.
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  original_path text,
  -- Versioned result payload; result_schema_version gates how clients parse it.
  result_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result_payload) = 'object'),
  result_schema_version integer not null default 1 check (result_schema_version >= 1),
  -- Machine-safe error code plus a translatable message key; never raw
  -- provider error text (plan §10.4).
  error_code text,
  error_message_key text,
  -- Client-generated key so retries cannot create duplicate jobs.
  idempotency_key text not null,
  -- Cleanup metadata: jobs (and their uploaded originals) past expires_at may
  -- be garbage-collected by a trusted server process.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create trigger import_jobs_set_updated_at
  before update on public.import_jobs
  for each row execute function public.set_updated_at();

-- unique (user_id, idempotency_key) already indexes plain user_id lookups.
create index import_jobs_user_status_idx on public.import_jobs (user_id, status);
create index import_jobs_expires_idx on public.import_jobs (expires_at)
  where expires_at is not null;
