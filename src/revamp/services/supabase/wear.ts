import type { SupabaseClient } from '@supabase/supabase-js'
import type { WearEventCreate, WearRepository } from '../contracts'
import type { WearEvent, WearEventItem } from '../../data/types'
import {
  wearEventFromRow,
  wearEventItemFromRow,
  type WearEventItemRow,
  type WearEventRow,
} from '../../data/rows'
import { AppError } from '../errors'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const EVENTS_TABLE = 'wear_events'
const EVENT_ITEMS_TABLE = 'wear_event_items'
const ITEMS_TABLE = 'wardrobe_items'

/** The later of two instants; `current` may be null (never worn). */
const laterOf = (current: string | null, candidate: string): string =>
  current !== null && Date.parse(current) >= Date.parse(candidate) ? current : candidate

/** Shape of the counter columns read back before each bump / reversal. */
interface ItemCounters {
  wear_count: number
  last_worn_at: string | null
}

export class SupabaseWearRepository implements WearRepository {
  constructor(private readonly client: SupabaseClient) {}

  async logWear(input: WearEventCreate): Promise<WearEvent> {
    const itemIds = [...new Set(input.itemIds)]
    if (itemIds.length === 0) {
      throw new AppError('validation', 'A wear event needs at least one item')
    }
    const userId = await requireUserId(this.client)

    // Not atomic: PostgREST has no client-side transactions, so this is a
    // sequence of writes — event, then join rows, then per-item counter
    // bumps. A failure part-way leaves the earlier writes in place (an event
    // whose counters lag); moving this into a Postgres function is the
    // upgrade path when that stops being acceptable.
    const insert: Record<string, unknown> = { user_id: userId }
    if (input.wornAt !== undefined) insert.worn_at = input.wornAt
    if (input.outfitId !== undefined) insert.outfit_id = input.outfitId
    if (input.notes !== undefined) insert.notes = input.notes
    const { data, error } = await this.client.from(EVENTS_TABLE).insert(insert).select().single()
    if (error) throw mapPostgrestError(error)
    const event = wearEventFromRow(data as WearEventRow)

    const joinRows = itemIds.map((itemId) => ({ wear_event_id: event.id, item_id: itemId }))
    const { error: joinError } = await this.client.from(EVENT_ITEMS_TABLE).insert(joinRows)
    if (joinError) throw mapPostgrestError(joinError)

    for (const itemId of itemIds) {
      await this.bumpItem(itemId, event.wornAt)
    }
    return event
  }

  async listEvents(params: { from?: string; to?: string } = {}): Promise<WearEvent[]> {
    let query = this.client
      .from(EVENTS_TABLE)
      .select('*')
      .order('worn_at', { ascending: false })
    if (params.from !== undefined) query = query.gte('worn_at', params.from)
    if (params.to !== undefined) query = query.lte('worn_at', params.to)

    const { data, error } = await query
    if (error) throw mapPostgrestError(error)
    return (data as WearEventRow[]).map(wearEventFromRow)
  }

  async listEventItems(eventId: string): Promise<WearEventItem[]> {
    const { data, error } = await this.client
      .from(EVENT_ITEMS_TABLE)
      .select('*')
      .eq('wear_event_id', eventId)
      .order('created_at', { ascending: true })
    if (error) throw mapPostgrestError(error)
    return (data as WearEventItemRow[]).map(wearEventItemFromRow)
  }

  async listForItem(itemId: string): Promise<WearEvent[]> {
    const { data, error } = await this.client
      .from(EVENTS_TABLE)
      .select('*, wear_event_items!inner(item_id)')
      .eq('wear_event_items.item_id', itemId)
      .order('worn_at', { ascending: false })
    if (error) throw mapPostgrestError(error)
    return (data as WearEventRow[]).map(wearEventFromRow)
  }

  async removeEvent(id: string): Promise<void> {
    // Capture the affected items before the cascade removes the join rows.
    const { data: joins, error: joinsError } = await this.client
      .from(EVENT_ITEMS_TABLE)
      .select('item_id')
      .eq('wear_event_id', id)
    if (joinsError) throw mapPostgrestError(joinsError)
    const affectedItemIds = [...new Set((joins as { item_id: string }[]).map((j) => j.item_id))]

    const { data, error } = await this.client
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (!data) throw new AppError('not-found', `Wear event ${id} does not exist`)

    // Not atomic (see logWear): the counters are reversed sequentially after
    // the delete; a failure part-way leaves some counters stale until the
    // next successful reversal or recount.
    for (const itemId of affectedItemIds) {
      await this.reverseItem(itemId)
    }
  }

  /** wearCount + 1, lastWornAt forward only. */
  private async bumpItem(itemId: string, wornAt: string): Promise<void> {
    const current = await this.readCounters(itemId)
    const { error } = await this.client
      .from(ITEMS_TABLE)
      .update({
        wear_count: current.wear_count + 1,
        last_worn_at: laterOf(current.last_worn_at, wornAt),
      })
      .eq('id', itemId)
    if (error) throw mapPostgrestError(error)
  }

  /** wearCount - 1 (floored at zero), lastWornAt recomputed from remaining events. */
  private async reverseItem(itemId: string): Promise<void> {
    const current = await this.readCounters(itemId)
    const { data, error } = await this.client
      .from(EVENT_ITEMS_TABLE)
      .select('wear_events(worn_at)')
      .eq('item_id', itemId)
    if (error) throw mapPostgrestError(error)

    // wear_event_id -> wear_events is many-to-one, so the embed is a single
    // object at runtime; the untyped client can only infer an array shape.
    const rows = data as unknown as { wear_events: { worn_at: string } | null }[]
    let latest: string | null = null
    for (const row of rows) {
      const wornAt = row.wear_events?.worn_at
      if (wornAt === undefined) continue
      if (latest === null || Date.parse(wornAt) > Date.parse(latest)) latest = wornAt
    }

    const { error: updateError } = await this.client
      .from(ITEMS_TABLE)
      .update({ wear_count: Math.max(0, current.wear_count - 1), last_worn_at: latest })
      .eq('id', itemId)
    if (updateError) throw mapPostgrestError(updateError)
  }

  private async readCounters(itemId: string): Promise<ItemCounters> {
    const { data, error } = await this.client
      .from(ITEMS_TABLE)
      .select('wear_count, last_worn_at')
      .eq('id', itemId)
      .single()
    if (error) throw mapPostgrestError(error)
    return data as ItemCounters
  }
}
