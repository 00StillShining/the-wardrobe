/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" serves the rebuild shell; anything else serves the legacy app. */
  readonly VITE_WARDROBE_REVAMP?: string
  /** exactly "true" enables sample/demo data surfaces outside DEV. */
  readonly VITE_WARDROBE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
