import { get, set, del, keys } from 'idb-keyval'

/**
 * Persistence boundary. Images are too big for localStorage, so blobs live
 * in IndexedDB (idb-keyval) and only JSON metadata lives in localStorage.
 * Every consumer goes through this interface; a real backend can slot in
 * later without touching the UI.
 */
export interface StorageAdapter {
  /** JSON metadata (items, sheets, flags) — small, synchronous-ish */
  readJSON<T>(key: string): T | null
  writeJSON<T>(key: string, value: T): void
  /** binary blobs (original photos, cutouts, exports) */
  putBlob(key: string, blob: Blob): Promise<void>
  getBlob(key: string): Promise<Blob | undefined>
  delBlob(key: string): Promise<void>
  listBlobKeys(): Promise<string[]>
  reset(): Promise<void>
}

const NS = 'wardrobe:'
const VERSION_KEY = 'schema-version'
export const STORAGE_SCHEMA_VERSION = 1

export type StorageBootstrapStatus = 'ready' | 'migrated' | 'incompatible'

export const localStorageAdapter: StorageAdapter = {
  readJSON<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(NS + key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch (error) {
      console.warn('[storage] readJSON failed', key, error)
      localStorage.removeItem(NS + key)
      return null
    }
  },
  writeJSON<T>(key: string, value: T): void {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value))
    } catch (e) {
      console.warn('[storage] writeJSON failed', key, e)
    }
  },
  putBlob: (key, blob) => set(NS + key, blob),
  getBlob: (key) => get(NS + key),
  delBlob: (key) => del(NS + key),
  async listBlobKeys() {
    const all = await keys()
    return all.filter((k): k is string => typeof k === 'string' && k.startsWith(NS)).map((k) => k.slice(NS.length))
  },
  async reset() {
    const metadataKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(NS)) metadataKeys.push(key)
    }
    metadataKeys.forEach((key) => localStorage.removeItem(key))

    const blobKeys = (await keys()).filter((key): key is string => typeof key === 'string' && key.startsWith(NS))
    await Promise.all(blobKeys.map((key) => del(key)))
    revokeCachedObjectUrls()
  },
}

/** Upgrade compatible metadata in place without discarding a user's wardrobe. */
export function initializeStorage(storage: StorageAdapter = localStorageAdapter): StorageBootstrapStatus {
  const version = storage.readJSON<unknown>(VERSION_KEY)
  if (typeof version === 'number' && version > STORAGE_SCHEMA_VERSION) return 'incompatible'
  if (version !== STORAGE_SCHEMA_VERSION) {
    storage.writeJSON(VERSION_KEY, STORAGE_SCHEMA_VERSION)
    return 'migrated'
  }
  return 'ready'
}

/** Live object-URL cache so the same blob key reuses one URL per session. */
const urlCache = new Map<string, string>()

function revokeCachedObjectUrls() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
}

export async function objectUrlFor(key: string, storage: StorageAdapter = localStorageAdapter): Promise<string | null> {
  if (urlCache.has(key)) return urlCache.get(key)!
  const blob = await storage.getBlob(key)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function cachedObjectUrl(key: string): string | null {
  return urlCache.get(key) ?? null
}
