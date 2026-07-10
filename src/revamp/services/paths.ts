/** Storage key hygiene shared by every MediaService implementation. */

import { AppError } from './errors'

/**
 * Reject keys that could escape the caller's own folder: empty keys,
 * absolute paths, empty segments and '.'/'..' traversal.
 */
export const assertSafeKey = (key: string): void => {
  if (
    key.length === 0 ||
    key.startsWith('/') ||
    key.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new AppError('validation', `Invalid storage key: '${key}'`)
  }
}
