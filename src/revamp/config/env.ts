/**
 * Typed runtime configuration (plan §11): reads the Vite public environment,
 * derives the backend mode, and fails clearly — never silently — when a
 * production build is missing required settings.
 *
 * Only anon/publishable values live here. No secrets, no service-role key,
 * ever (plan §10.1).
 */

export type BackendMode = 'supabase' | 'local'

export interface RuntimeEnv {
  readonly supabaseUrl: string | null
  readonly supabaseAnonKey: string | null
}

const normalize = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Pure derivation, unit-testable under node: 'supabase' only when BOTH the
 * URL and the anon key are present; anything less falls back to 'local'.
 */
export const deriveBackendMode = (env: RuntimeEnv): BackendMode =>
  env.supabaseUrl !== null && env.supabaseAnonKey !== null ? 'supabase' : 'local'

/**
 * A production bundle running in 'local' mode means the deploy forgot its
 * backend settings. The shell must render a fail-closed configuration error
 * instead of quietly persisting real user data to this browser only.
 */
export const deriveProductionMisconfigured = (env: RuntimeEnv, isProd: boolean): boolean =>
  isProd && deriveBackendMode(env) === 'local'

/**
 * `import.meta.env` exists under Vite; under plain node (unit tests bundled
 * by esbuild) only the DEV/PROD/MODE keys are defined, so guard the object.
 */
const viteEnv: Partial<ImportMetaEnv> =
  (import.meta as { env?: ImportMetaEnv }).env ?? {}

export const runtimeEnv: RuntimeEnv = {
  supabaseUrl: normalize(viteEnv.VITE_SUPABASE_URL),
  supabaseAnonKey: normalize(viteEnv.VITE_SUPABASE_ANON_KEY),
}

export const backendMode = (): BackendMode => deriveBackendMode(runtimeEnv)

/**
 * Supabase connection settings, or null when running local-first.
 * Callers must handle null rather than assuming a backend exists.
 */
export const supabaseConfig = (): { url: string; anonKey: string } | null =>
  runtimeEnv.supabaseUrl !== null && runtimeEnv.supabaseAnonKey !== null
    ? { url: runtimeEnv.supabaseUrl, anonKey: runtimeEnv.supabaseAnonKey }
    : null

/** True only in a PROD bundle that is missing its backend configuration. */
export const productionMisconfigured: boolean = deriveProductionMisconfigured(
  runtimeEnv,
  import.meta.env.PROD,
)
