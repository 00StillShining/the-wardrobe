/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" serves the rebuild shell; anything else serves the legacy app. */
  readonly VITE_WARDROBE_REVAMP?: string
  /** exactly "true" enables sample/demo data surfaces outside DEV. */
  readonly VITE_WARDROBE_DEMO?: string
  /** Supabase project URL (public). Both this and the anon key must be set for 'supabase' backend mode. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/publishable key (public; RLS enforces authorization). Never a service-role key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
