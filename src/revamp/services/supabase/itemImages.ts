import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemImageCreate, ItemImageRepository } from '../contracts'
import type { ItemImage } from '../../data/types'
import { itemImageFromRow, type ItemImageRow } from '../../data/rows'
import { AppError } from '../errors'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const TABLE = 'item_images'

export class SupabaseItemImageRepository implements ItemImageRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForItem(itemId: string): Promise<ItemImage[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (error) throw mapPostgrestError(error)
    return (data as ItemImageRow[]).map(itemImageFromRow)
  }

  async create(input: ItemImageCreate): Promise<ItemImage> {
    const userId = await requireUserId(this.client)
    const insert: Record<string, unknown> = {
      user_id: userId,
      item_id: input.itemId,
      kind: input.kind,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
    }
    if (input.width !== undefined) insert.width = input.width
    if (input.height !== undefined) insert.height = input.height
    if (input.bytes !== undefined) insert.bytes = input.bytes
    if (input.processingVersion !== undefined) insert.processing_version = input.processingVersion
    if (input.status !== undefined) insert.status = input.status
    if (input.errorCode !== undefined) insert.error_code = input.errorCode

    const { data, error } = await this.client.from(TABLE).insert(insert).select().single()
    if (error) throw mapPostgrestError(error)
    return itemImageFromRow(data as ItemImageRow)
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await this.client.from(TABLE).delete().eq('id', id).select('id')
    if (error) throw mapPostgrestError(error)
    if (data === null || data.length === 0) {
      throw new AppError('not-found', `Item image ${id} does not exist`)
    }
  }
}
