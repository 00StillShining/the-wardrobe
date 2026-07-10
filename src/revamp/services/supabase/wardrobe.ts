import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WardrobeItemCreate,
  WardrobeItemUpdate,
  WardrobeListParams,
  WardrobeRepository,
} from '../contracts'
import type { WardrobeItem } from '../../data/types'
import { wardrobeItemFromRow, type WardrobeItemRow } from '../../data/rows'
import { AppError } from '../errors'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const TABLE = 'wardrobe_items'

/**
 * PostgREST or() filters are comma/paren-delimited, so a raw search term
 * could break out of its ilike pattern. Neutralize the delimiters and the
 * LIKE wildcards; substring search does not need them.
 */
const sanitizeSearchTerm = (term: string): string => term.replace(/[%_,()]/g, ' ').trim()

const rowPatchFromUpdate = (patch: WardrobeItemUpdate): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.brand !== undefined) row.brand = patch.brand
  if (patch.category !== undefined) row.category = patch.category
  if (patch.subcategory !== undefined) row.subcategory = patch.subcategory
  if (patch.layerType !== undefined) row.layer_type = patch.layerType
  if (patch.ownershipStatus !== undefined) row.ownership_status = patch.ownershipStatus
  if (patch.size !== undefined) row.size = patch.size
  if (patch.primaryColor !== undefined) row.primary_color = patch.primaryColor
  if (patch.palette !== undefined) row.palette = patch.palette
  if (patch.seasons !== undefined) row.seasons = patch.seasons
  if (patch.occasions !== undefined) row.occasions = patch.occasions
  if (patch.materialNotes !== undefined) row.material_notes = patch.materialNotes
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.pricePaid !== undefined) row.price_paid = patch.pricePaid
  if (patch.currency !== undefined) row.currency = patch.currency
  if (patch.purchasedAt !== undefined) row.purchased_at = patch.purchasedAt
  if (patch.merchant !== undefined) row.merchant = patch.merchant
  if (patch.productUrl !== undefined) row.product_url = patch.productUrl
  if (patch.sourceType !== undefined) row.source_type = patch.sourceType
  if (patch.processingStatus !== undefined) row.processing_status = patch.processingStatus
  if (patch.lastWornAt !== undefined) row.last_worn_at = patch.lastWornAt
  if (patch.wearCount !== undefined) row.wear_count = patch.wearCount
  return row
}

export class SupabaseWardrobeRepository implements WardrobeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(params: WardrobeListParams = {}): Promise<WardrobeItem[]> {
    let query = this.client.from(TABLE).select('*').is('deleted_at', null)

    if (params.category !== undefined) query = query.eq('category', params.category)
    if (params.ownershipStatus !== undefined) {
      query = query.eq('ownership_status', params.ownershipStatus)
    }
    if (params.season !== undefined) query = query.contains('seasons', [params.season])
    if (params.occasion !== undefined) query = query.contains('occasions', [params.occasion])
    if (params.search !== undefined) {
      const term = sanitizeSearchTerm(params.search)
      if (term.length > 0) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`)
    }

    switch (params.sort ?? 'newest') {
      case 'name':
        query = query.order('name', { ascending: true })
        break
      case 'lastWorn':
        query = query.order('last_worn_at', { ascending: false, nullsFirst: false })
        break
      case 'mostWorn':
        query = query.order('wear_count', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query
    if (error) throw mapPostgrestError(error)
    return (data as WardrobeItemRow[]).map(wardrobeItemFromRow)
  }

  async get(id: string): Promise<WardrobeItem | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    return data ? wardrobeItemFromRow(data as WardrobeItemRow) : null
  }

  async create(input: WardrobeItemCreate): Promise<WardrobeItem> {
    const userId = await requireUserId(this.client)
    const insert: Record<string, unknown> = {
      user_id: userId,
      name: input.name,
      category: input.category,
      layer_type: input.layerType,
      ...rowPatchFromUpdate(input),
    }
    const { data, error } = await this.client.from(TABLE).insert(insert).select().single()
    if (error) throw mapPostgrestError(error)
    return wardrobeItemFromRow(data as WardrobeItemRow)
  }

  async update(
    id: string,
    patch: WardrobeItemUpdate,
    expectedVersion: number,
  ): Promise<WardrobeItem> {
    const row = rowPatchFromUpdate(patch)
    row.version = expectedVersion + 1
    // The version equality filter makes this a compare-and-swap: zero rows
    // means someone else updated first (or the item is gone).
    const { data, error } = await this.client
      .from(TABLE)
      .update(row)
      .eq('id', id)
      .eq('version', expectedVersion)
      .is('deleted_at', null)
      .select()
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (data) return wardrobeItemFromRow(data as WardrobeItemRow)

    const current = await this.get(id)
    if (current) {
      throw new AppError(
        'conflict',
        `Item ${id} changed since it was read (expected version ${expectedVersion}, found ${current.version})`,
      )
    }
    throw new AppError('not-found', `Item ${id} does not exist`)
  }

  async archive(id: string): Promise<WardrobeItem> {
    const current = await this.get(id)
    if (!current) throw new AppError('not-found', `Item ${id} does not exist`)
    return this.update(id, { ownershipStatus: 'archived' }, current.version)
  }

  async softDelete(id: string): Promise<void> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (data) return

    // Zero rows: either already soft-deleted (idempotent success) or absent.
    const { data: existing, error: existsError } = await this.client
      .from(TABLE)
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (existsError) throw mapPostgrestError(existsError)
    if (!existing) throw new AppError('not-found', `Item ${id} does not exist`)
  }
}
