/**
 * Honest mapping from Supabase / PostgREST / storage failures onto the
 * AppError union. Anything we cannot classify stays 'unknown' — never
 * guessed into a friendlier code.
 */

import { AppError } from '../errors'

interface PostgrestErrorLike {
  code?: string
  message: string
}

const NETWORK_HINTS = ['fetch failed', 'failed to fetch', 'network', 'timeout']

const looksLikeNetwork = (message: string): boolean => {
  const lower = message.toLowerCase()
  return NETWORK_HINTS.some((hint) => lower.includes(hint))
}

/** PostgREST/Postgres error -> AppError. */
export const mapPostgrestError = (error: PostgrestErrorLike): AppError => {
  switch (error.code) {
    case '23505': // unique_violation
      return new AppError('conflict', error.message, error)
    case 'PGRST116': // .single()/.maybeSingle() row-count mismatch
      return new AppError('not-found', error.message, error)
    case '23503': // foreign_key_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation (bad uuid etc.)
      return new AppError('validation', error.message, error)
    case '42501': // insufficient_privilege (RLS denial)
      return new AppError('auth', error.message, error)
    default:
      return looksLikeNetwork(error.message)
        ? new AppError('network', error.message, error)
        : new AppError('unknown', error.message, error)
  }
}

/** Is this Postgres unique_violation (used for idempotent create)? */
export const isUniqueViolation = (error: PostgrestErrorLike): boolean => error.code === '23505'

interface AuthErrorLike {
  status?: number
  message: string
}

/** GoTrue auth error -> AppError. */
export const mapAuthError = (error: AuthErrorLike): AppError => {
  if (looksLikeNetwork(error.message)) return new AppError('network', error.message, error)
  if (error.status !== undefined && error.status >= 500) {
    return new AppError('unknown', error.message, error)
  }
  return new AppError('auth', error.message, error)
}

interface StorageErrorLike {
  message: string
}

/** Storage API error -> AppError. */
export const mapStorageError = (error: StorageErrorLike): AppError => {
  if (looksLikeNetwork(error.message)) return new AppError('network', error.message, error)
  const lower = error.message.toLowerCase()
  if (lower.includes('not found')) return new AppError('not-found', error.message, error)
  if (lower.includes('unauthorized') || lower.includes('violates row-level security')) {
    return new AppError('auth', error.message, error)
  }
  return new AppError('storage', error.message, error)
}
