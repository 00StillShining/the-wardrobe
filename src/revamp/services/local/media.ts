import type { MediaBucket, MediaService, MediaUpload } from '../contracts'
import { AppError } from '../errors'
import { assertSafeKey } from '../paths'
import type { BlobStore } from './stores'
import { LOCAL_USER_ID } from './shared'

/**
 * Local MediaService: blobs live in the injected BlobStore (IndexedDB via
 * idb-keyval in the browser, an in-memory map in tests). Paths follow the
 * exact same '<userId>/<key>' convention as the Supabase backend so records
 * written locally stay portable.
 */
export class LocalMediaService implements MediaService {
  constructor(private readonly blobs: BlobStore) {}

  async upload(input: MediaUpload): Promise<string> {
    assertSafeKey(input.key)
    const path = `${LOCAL_USER_ID}/${input.key}`
    const storeKey = this.storeKey(input.bucket, path)
    if (input.upsert !== true && (await this.blobs.get(storeKey)) !== undefined) {
      // Mirrors Supabase storage: plain upload refuses to overwrite.
      throw new AppError('conflict', `Object already exists at '${path}' in '${input.bucket}'`)
    }
    await this.blobs.put(storeKey, input.blob)
    return path
  }

  async getObjectUrl(bucket: MediaBucket, path: string): Promise<string> {
    this.assertOwnPath(path)
    const blob = await this.blobs.get(this.storeKey(bucket, path))
    if (blob === undefined) {
      throw new AppError('not-found', `No object at '${path}' in '${bucket}'`)
    }
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      throw new AppError('storage', 'Object URLs are not available in this environment')
    }
    return URL.createObjectURL(blob)
  }

  async delete(bucket: MediaBucket, path: string): Promise<void> {
    this.assertOwnPath(path)
    await this.blobs.delete(this.storeKey(bucket, path))
  }

  private storeKey(bucket: MediaBucket, path: string): string {
    return `${bucket}/${path}`
  }

  private assertOwnPath(path: string): void {
    if (!path.startsWith(`${LOCAL_USER_ID}/`)) {
      throw new AppError('validation', 'Storage path must start with the authenticated user id')
    }
  }
}
