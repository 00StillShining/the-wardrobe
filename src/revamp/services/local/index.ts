/**
 * Wires the local-first service set: metadata in localStorage under the
 * 'wardrobe2:' namespace, blobs in IndexedDB. All storage flows through
 * injected seams so node tests can pass in-memory doubles.
 */

import type { Backend } from '../contracts'
import { LocalAuthService } from './auth'
import { LocalProfileRepository } from './profiles'
import { LocalWardrobeRepository } from './wardrobe'
import { LocalItemImageRepository } from './itemImages'
import { LocalImportJobRepository } from './importJobs'
import { LocalMediaService } from './media'
import type { LocalClock } from './shared'
import { browserBlobStore, browserKeyValueStore, type BlobStore, type KeyValueStore } from './stores'

export interface LocalBackendOptions extends LocalClock {
  /** Metadata store; defaults to localStorage (browser only). */
  kv?: KeyValueStore
  /** Blob store; defaults to IndexedDB via idb-keyval (browser only). */
  blobs?: BlobStore
}

export const createLocalBackend = (options: LocalBackendOptions = {}): Backend => {
  const kv = options.kv ?? browserKeyValueStore()
  const blobs = options.blobs ?? browserBlobStore()
  const clock: LocalClock = { now: options.now, newId: options.newId }
  return {
    mode: 'local',
    auth: new LocalAuthService(kv),
    profiles: new LocalProfileRepository(kv, clock),
    wardrobe: new LocalWardrobeRepository(kv, clock),
    itemImages: new LocalItemImageRepository(kv, clock),
    importJobs: new LocalImportJobRepository(kv, clock),
    media: new LocalMediaService(blobs),
  }
}

export { LocalAuthService } from './auth'
export { LocalProfileRepository } from './profiles'
export { LocalWardrobeRepository } from './wardrobe'
export { LocalItemImageRepository } from './itemImages'
export { LocalImportJobRepository } from './importJobs'
export { LocalMediaService } from './media'
export { LOCAL_USER_ID, NAMESPACE } from './shared'
export type { BlobStore, KeyValueStore } from './stores'
