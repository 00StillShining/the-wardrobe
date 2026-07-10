/**
 * Small, honest error union for the service layer (plan §10.3).
 *
 * Every service implementation maps backend-specific failures onto these
 * codes at the boundary; the UI never sees raw provider errors. The original
 * failure travels in `cause` for logging, never for rendering.
 */

export type AppErrorCode =
  /** Not signed in, session expired, or the backend refused the credential. */
  | 'auth'
  /** The requested record does not exist (or is soft-deleted). */
  | 'not-found'
  /** Optimistic-concurrency or uniqueness conflict; refetch and retry. */
  | 'conflict'
  /** The request was malformed or violated a constraint. */
  | 'validation'
  /** Transport failure; safe to retry. */
  | 'network'
  /** Object storage failure (upload, signed URL, delete). */
  | 'storage'
  /** Anything we cannot classify honestly. */
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly cause?: unknown

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError

/** Wrap an unknown thrown value without discarding it. */
export const toAppError = (value: unknown, fallbackMessage = 'Unexpected error'): AppError => {
  if (isAppError(value)) return value
  if (value instanceof Error) return new AppError('unknown', value.message, value)
  return new AppError('unknown', fallbackMessage, value)
}
