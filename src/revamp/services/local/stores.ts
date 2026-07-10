/**
 * Storage seams for the local backend. The repositories depend only on
 * these two tiny interfaces, injected through the constructor, so node
 * unit tests pass in-memory doubles and the browser passes localStorage /
 * IndexedDB adapters.
 */

import { del, get, set } from 'idb-keyval'
import { AppError } from '../errors'

export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export interface BlobStore {
  put(key: string, blob: Blob): Promise<void>
  get(key: string): Promise<Blob | undefined>
  delete(key: string): Promise<void>
}

const requireLocalStorage = (): Storage => {
  if (typeof localStorage === 'undefined') {
    throw new AppError('storage', 'localStorage is not available in this environment')
  }
  return localStorage
}

/** Browser default: window.localStorage. Fails lazily, not at construction. */
export const browserKeyValueStore = (): KeyValueStore => ({
  get: (key) => requireLocalStorage().getItem(key),
  set: (key, value) => requireLocalStorage().setItem(key, value),
  remove: (key) => requireLocalStorage().removeItem(key),
})

/** Browser default: IndexedDB via idb-keyval (already a dependency). */
export const browserBlobStore = (): BlobStore => ({
  put: (key, blob) => set(key, blob),
  get: (key) => get<Blob>(key),
  delete: (key) => del(key),
})
