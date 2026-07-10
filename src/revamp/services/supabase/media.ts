import type { SupabaseClient } from '@supabase/supabase-js'
import type { MediaBucket, MediaService, MediaUpload } from '../contracts'
import { AppError } from '../errors'
import { assertSafeKey } from '../paths'
import { mapStorageError } from './mapError'
import { requireUserId } from './session'

/** Signed URLs stay short-lived and are re-requested by callers (plan §10.5). */
const SIGNED_URL_TTL_SECONDS = 15 * 60

export class SupabaseMediaService implements MediaService {
  constructor(private readonly client: SupabaseClient) {}

  /** Every path is forced under '<userId>/' — the RLS prefix policies then hold. */
  async upload(input: MediaUpload): Promise<string> {
    const userId = await requireUserId(this.client)
    assertSafeKey(input.key)
    const path = `${userId}/${input.key}`
    const { error } = await this.client.storage.from(input.bucket).upload(path, input.blob, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
    })
    if (error) throw mapStorageError(error)
    return path
  }

  async getObjectUrl(bucket: MediaBucket, path: string): Promise<string> {
    await this.assertOwnPath(path)
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) throw mapStorageError(error)
    return data.signedUrl
  }

  async delete(bucket: MediaBucket, path: string): Promise<void> {
    await this.assertOwnPath(path)
    const { error } = await this.client.storage.from(bucket).remove([path])
    if (error) throw mapStorageError(error)
  }

  /**
   * Defense in depth: RLS already denies foreign paths, but failing fast
   * here keeps a coding mistake from ever leaving the client.
   */
  private async assertOwnPath(path: string): Promise<void> {
    const userId = await requireUserId(this.client)
    if (!path.startsWith(`${userId}/`)) {
      throw new AppError('validation', 'Storage path must start with the authenticated user id')
    }
  }
}
