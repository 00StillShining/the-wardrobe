# Supabase backend for THE WARDROBE

Schema and Row Level Security for the rebuild (plan §10). Authored offline —
this machine has no Docker, no Supabase CLI and no `psql`, so **nothing in
this folder has been executed against a real Postgres yet**. Treat it as
reviewed source, not verified infrastructure, until the steps below are run.

## Contents

- `migrations/0001_initial_schema.sql` — tables, CHECK constraints, indexes,
  `updated_at` triggers for: `profiles`, `wardrobe_items`, `item_images`,
  `outfits`, `outfit_items`, `style_boards`, `board_elements`, `wear_events`,
  `wear_event_items`, `import_jobs`.
- `migrations/0002_rls_policies.sql` — RLS enabled on every table, per-user
  policies (children validate through parents), three private storage
  buckets (`originals`, `derivatives`, `exports`) with `<user_id>/...`
  path-prefix policies.

## Applying to a real project

With the Supabase CLI (preferred — keeps migration history):

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push          # applies supabase/migrations in order
```

Without the CLI: open the project's SQL editor in the Supabase dashboard and
run `0001_initial_schema.sql` then `0002_rls_policies.sql`, in that order,
each as a single script. Note that on some hosted projects the dashboard SQL
role cannot create policies on `storage.objects`; if the storage policies
fail, recreate them via Dashboard → Storage → Policies with the same
expressions (they are commented inline in `0002`).

Afterwards, generate client types when we adopt them (optional for now):

```sh
supabase gen types typescript --linked > src/revamp/data/database.types.ts
```

## What remains unverified without a live database

- SQL syntax and object creation (never executed; authored to Postgres 15 /
  Supabase conventions, but a typo would only surface on first apply).
- RLS behaviour under real `auth.uid()` — the two-user cross-access matrix
  required by plan §10.5 must be run with `scripts/rls-verify.mjs`:

  ```sh
  RLS_VERIFY_ALLOW=<project-ref>.supabase.co \
  SUPABASE_URL=https://<project-ref>.supabase.co \
  SUPABASE_ANON_KEY=... \
  RLS_USER_A_EMAIL=... RLS_USER_A_PASSWORD=... \
  RLS_USER_B_EMAIL=... RLS_USER_B_PASSWORD=... \
  node scripts/rls-verify.mjs
  ```

  The script refuses to run unless `RLS_VERIFY_ALLOW` matches the URL's
  hostname, so it cannot be pointed at production by accident.
- Storage bucket creation and prefix policies (including that listing another
  user's folder returns nothing).
- Trigger behaviour of `set_updated_at` on every table.
- Index usefulness under realistic row counts (`explain analyze` later).
- Cascade behaviour (`on delete cascade` / `set null`) across the graph.

## Deliberate choices

- CHECK constraints instead of Postgres enums so new values ship as plain
  migrations.
- `outfit_items` and `wear_event_items` carry no `user_id` (per plan field
  lists); their policies validate through **both** parents instead.
- `board_elements.kind` is intentionally un-CHECKed; element payloads are
  validated per kind in the app schema layer.
- `wear_count` on `wardrobe_items` is a cache and must stay derivable from
  `wear_event_items`.
- No service-role key is used anywhere in the client; service role exists
  only for trusted server code (plan §10.1).
