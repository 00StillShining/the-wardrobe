import type { WearEventCreate, WearRepository } from '../contracts'
import type { WardrobeItem, WearEvent, WearEventItem } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

/** The later of two instants; `current` may be null (never worn). */
const laterOf = (current: string | null, candidate: string): string =>
  current !== null && Date.parse(current) >= Date.parse(candidate) ? current : candidate

export class LocalWearRepository implements WearRepository {
  private readonly events: JsonCollection<WearEvent>
  private readonly eventItems: JsonCollection<WearEventItem>
  /**
   * The same collection LocalWardrobeRepository owns — wear logging maintains
   * the cached wearCount / lastWornAt counters on the items themselves.
   */
  private readonly items: JsonCollection<WardrobeItem>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.events = new JsonCollection<WearEvent>(kv, 'wear-events')
    this.eventItems = new JsonCollection<WearEventItem>(kv, 'wear-event-items')
    this.items = new JsonCollection<WardrobeItem>(kv, 'wardrobe-items')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async logWear(input: WearEventCreate): Promise<WearEvent> {
    const itemIds = [...new Set(input.itemIds)]
    if (itemIds.length === 0) {
      throw new AppError('validation', 'A wear event needs at least one item')
    }
    // Mirrors the item_id foreign key: unknown items are rejected up front.
    const items = this.items.read()
    for (const itemId of itemIds) {
      if (!items.some((item) => item.id === itemId)) {
        throw new AppError('validation', `Wardrobe item ${itemId} does not exist`)
      }
    }

    const now = this.now()
    const event: WearEvent = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      wornAt: input.wornAt ?? now,
      outfitId: input.outfitId ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const events = this.events.read()
    events.push(event)
    this.events.write(events)

    const joins = this.eventItems.read()
    for (const itemId of itemIds) {
      joins.push({ id: this.newId(), wearEventId: event.id, itemId })
    }
    this.eventItems.write(joins)

    this.items.write(
      items.map((item) =>
        itemIds.includes(item.id)
          ? {
              ...item,
              wearCount: item.wearCount + 1,
              lastWornAt: laterOf(item.lastWornAt, event.wornAt),
              updatedAt: now,
            }
          : item,
      ),
    )
    return event
  }

  async listEvents(params: { from?: string; to?: string } = {}): Promise<WearEvent[]> {
    const { from, to } = params
    return this.events
      .read()
      .filter(
        (event) =>
          (from === undefined || Date.parse(event.wornAt) >= Date.parse(from)) &&
          (to === undefined || Date.parse(event.wornAt) <= Date.parse(to)),
      )
      .sort((a, b) => Date.parse(b.wornAt) - Date.parse(a.wornAt))
  }

  async listEventItems(eventId: string): Promise<WearEventItem[]> {
    return this.eventItems.read().filter((join) => join.wearEventId === eventId)
  }

  async listForItem(itemId: string): Promise<WearEvent[]> {
    const eventIds = new Set(
      this.eventItems
        .read()
        .filter((join) => join.itemId === itemId)
        .map((join) => join.wearEventId),
    )
    return this.events
      .read()
      .filter((event) => eventIds.has(event.id))
      .sort((a, b) => Date.parse(b.wornAt) - Date.parse(a.wornAt))
  }

  async removeEvent(id: string): Promise<void> {
    const events = this.events.read()
    const index = events.findIndex((event) => event.id === id)
    if (index === -1) throw new AppError('not-found', `Wear event ${id} does not exist`)

    const joins = this.eventItems.read()
    const affectedItemIds = new Set(
      joins.filter((join) => join.wearEventId === id).map((join) => join.itemId),
    )
    const remainingEvents = events.filter((event) => event.id !== id)
    const remainingJoins = joins.filter((join) => join.wearEventId !== id)
    this.events.write(remainingEvents)
    this.eventItems.write(remainingJoins)

    // Reverse the cached counters honestly: decrement wearCount (floored at
    // zero) and recompute lastWornAt from the events that remain.
    const now = this.now()
    this.items.write(
      this.items.read().map((item) => {
        if (!affectedItemIds.has(item.id)) return item
        return {
          ...item,
          wearCount: Math.max(0, item.wearCount - 1),
          lastWornAt: latestWornAt(remainingJoins, remainingEvents, item.id),
          updatedAt: now,
        }
      }),
    )
  }
}

/** Most recent wornAt among the events that reference the item, or null. */
const latestWornAt = (
  joins: WearEventItem[],
  events: WearEvent[],
  itemId: string,
): string | null => {
  const eventIds = new Set(
    joins.filter((join) => join.itemId === itemId).map((join) => join.wearEventId),
  )
  let latest: string | null = null
  for (const event of events) {
    if (!eventIds.has(event.id)) continue
    if (latest === null || Date.parse(event.wornAt) > Date.parse(latest)) latest = event.wornAt
  }
  return latest
}
