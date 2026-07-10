/**
 * Backend factory (plan §10.3): one call site decides which wired service
 * set the app receives. Features depend on the contracts only.
 */

import { backendMode, supabaseConfig, type BackendMode } from '../config/env'
import type { Backend } from './contracts'
import { AppError } from './errors'
import { createLocalBackend, type LocalBackendOptions } from './local'
import { createSupabaseBackend } from './supabase'

/**
 * Create the wired service set for the given mode (defaults to the mode
 * derived from the environment). Throws AppError 'validation' when
 * 'supabase' is requested without both VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY — callers must not fall back silently.
 */
export const createBackend = (
  mode: BackendMode = backendMode(),
  localOptions?: LocalBackendOptions,
): Backend => {
  if (mode === 'supabase') {
    const config = supabaseConfig()
    if (config === null) {
      throw new AppError(
        'validation',
        'Supabase backend requested but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured',
      )
    }
    return createSupabaseBackend(config)
  }
  return createLocalBackend(localOptions)
}

export * from './contracts'
export { AppError, isAppError, toAppError, type AppErrorCode } from './errors'
export { createLocalBackend, type LocalBackendOptions } from './local'
export { createSupabaseBackend, type SupabaseBackendConfig } from './supabase'
