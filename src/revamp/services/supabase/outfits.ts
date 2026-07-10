import type { SupabaseClient } from '@supabase/supabase-js'
import type { OutfitCreate, OutfitItemInput, OutfitRepository, OutfitUpdate } from '../contracts'
import type { Outfit, OutfitItem } from '../../data/types'
import {
  outfitFromRow,
  outfitItemFromRow,
  type OutfitItemRow,
  type OutfitRow,
} from '../../data/rows'
import { AppError } from '../errors'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const TABLE = 'outfits'
const ITEMS_TABLE = 'outfit_items'

const rowPatchFromUpdate = (patch: OutfitUpdate): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.occasion !== undefined) row.occasion = patch.occasion
  if (patch.season !== undefined) row.season = patch.season
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.plannedFor !== undefined) row.planned_for = patch.plannedFor
  if (patch.coverImagePath !== undefined) row.cover_image_path = patch.coverImagePath
  return row
}

const itemRowFromInput = (outfitId: string, input: OutfitItemInput): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    outfit_id: outfitId,
    item_id: input.itemId,
    layer_slot: input.layerSlot,
  }
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder
  if (input.positionX !== undefined) row.position_x = input.positionX
  if (input.positionY !== undefined) row.position_y = input.positionY
  if (input.scale !== undefined) row.scale = input.scale
  if (input.rotation !== undefined) row.rotation = input.rotation
  return row
}

export class SupabaseOutfitRepository implements OutfitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Outfit[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw mapPostgrestError(error)
    return (data as OutfitRow[]).map(outfitFromRow)
  }

  async get(id: string): Promise<Outfit | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    return data ? outfitFromRow(data as OutfitRow) : null
  }

  async create(input: OutfitCreate, items: OutfitItemInput[] = []): Promise<Outfit> {
    const userId = await requireUserId(this.client)
    const insert: Record<string, unknown> = {
      user_id: userId,
      name: input.name,
      ...rowPatchFromUpdate(input),
    }
    const { data, error } = await this.client.from(TABLE).insert(insert).select().single()
    if (error) throw mapPostgrestError(error)
    const outfit = outfitFromRow(data as OutfitRow)

    // Not atomic: PostgREST has no client-side transactions, so a failure
    // here leaves the outfit without its items — callers may retry via
    // setItems. A Postgres function would make create-with-items atomic.
    if (items.length > 0) await this.insertItems(outfit.id, items)
    return outfit
  }

  async update(id: string, patch: OutfitUpdate): Promise<Outfit> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(rowPatchFromUpdate(patch))
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (!data) throw new AppError('not-found', `Outfit ${id} does not exist`)
    return outfitFromRow(data as OutfitRow)
  }

  async duplicate(id: string): Promise<Outfit> {
    const source = await this.get(id)
    if (!source) throw new AppError('not-found', `Outfit ${id} does not exist`)
    const items = await this.listItems(id)
    return this.create(
      {
        name: `${source.name} (copy)`,
        occasion: source.occasion,
        season: source.season,
        notes: source.notes,
        plannedFor: source.plannedFor,
        coverImagePath: source.coverImagePath,
      },
      items.map((item) => ({
        itemId: item.itemId,
        layerSlot: item.layerSlot,
        sortOrder: item.sortOrder,
        positionX: item.positionX,
        positionY: item.positionY,
        scale: item.scale,
        rotation: item.rotation,
      })),
    )
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
    if (!existing) throw new AppError('not-found', `Outfit ${id} does not exist`)
  }

  async listItems(outfitId: string): Promise<OutfitItem[]> {
    const { data, error } = await this.client
      .from(ITEMS_TABLE)
      .select('*')
      .eq('outfit_id', outfitId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw mapPostgrestError(error)
    return (data as OutfitItemRow[]).map(outfitItemFromRow)
  }

  async setItems(outfitId: string, items: OutfitItemInput[]): Promise<OutfitItem[]> {
    const outfit = await this.get(outfitId)
    if (!outfit) throw new AppError('not-found', `Outfit ${outfitId} does not exist`)

    // Replace = delete + insert, sequential because PostgREST has no
    // client-side transactions: a failure between the two calls leaves the
    // outfit temporarily empty. Retrying setItems converges.
    const { error: deleteError } = await this.client
      .from(ITEMS_TABLE)
      .delete()
      .eq('outfit_id', outfitId)
    if (deleteError) throw mapPostgrestError(deleteError)
    if (items.length === 0) return []
    return this.insertItems(outfitId, items)
  }

  private async insertItems(outfitId: string, items: OutfitItemInput[]): Promise<OutfitItem[]> {
    const rows = items.map((input) => itemRowFromInput(outfitId, input))
    const { data, error } = await this.client.from(ITEMS_TABLE).insert(rows).select()
    if (error) throw mapPostgrestError(error)
    return (data as OutfitItemRow[]).map(outfitItemFromRow)
  }
}
