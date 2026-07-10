import type { WardrobeItem } from '../../data/types'

/**
 * Insights metrics (plan §9.8) — pure functions over the user's REAL data.
 * Each is unit-tested against a fixture; totals with missing inputs say so
 * explicitly instead of pretending completeness. No sample retailer data.
 */

const live = (items: WardrobeItem[]) => items.filter((i) => i.ownershipStatus !== 'archived')
const owned = (items: WardrobeItem[]) => items.filter((i) => i.ownershipStatus === 'owned')
const wishlist = (items: WardrobeItem[]) => items.filter((i) => i.ownershipStatus === 'wishlist')

export interface ValueSummary {
  total: number
  currency: string
  pricedCount: number
  missingPriceCount: number
}

export function recordedValue(items: WardrobeItem[], of: 'owned' | 'wishlist' = 'owned'): ValueSummary {
  const pool = of === 'owned' ? owned(items) : wishlist(items)
  let total = 0
  let priced = 0
  for (const item of pool) {
    if (item.pricePaid != null) {
      total += item.pricePaid
      priced++
    }
  }
  return {
    total: Math.round(total * 100) / 100,
    currency: pool.find((i) => i.currency)?.currency ?? 'GBP',
    pricedCount: priced,
    missingPriceCount: pool.length - priced,
  }
}

export function counts(items: WardrobeItem[]) {
  return { owned: owned(items).length, wishlist: wishlist(items).length, total: live(items).length }
}

export interface Bucket {
  key: string
  count: number
}

export function categoryDistribution(items: WardrobeItem[]): Bucket[] {
  const map = new Map<string, number>()
  for (const item of owned(items)) map.set(item.category, (map.get(item.category) ?? 0) + 1)
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

export function colorDistribution(items: WardrobeItem[]): Bucket[] {
  const map = new Map<string, number>()
  for (const item of owned(items)) {
    if (item.primaryColor) map.set(item.primaryColor, (map.get(item.primaryColor) ?? 0) + 1)
  }
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 8)
}

export function byWear(items: WardrobeItem[], direction: 'most' | 'least', n = 5): WardrobeItem[] {
  const pool = owned(items)
  return [...pool]
    .sort((a, b) =>
      direction === 'most' ? (b.wearCount ?? 0) - (a.wearCount ?? 0) : (a.wearCount ?? 0) - (b.wearCount ?? 0),
    )
    .slice(0, n)
}

export function notWornSince(items: WardrobeItem[], sinceIso: string): WardrobeItem[] {
  const since = Date.parse(sinceIso)
  return owned(items).filter((i) => {
    if (!i.lastWornAt) return true
    return Date.parse(i.lastWornAt) < since
  })
}

export interface CostPerWear {
  item: WardrobeItem
  costPerWear: number
}

/** Only where BOTH price and wear exist — never a misleading division. */
export function costPerWear(items: WardrobeItem[], n = 5): CostPerWear[] {
  return owned(items)
    .filter((i) => i.pricePaid != null && (i.wearCount ?? 0) > 0)
    .map((item) => ({ item, costPerWear: Math.round((item.pricePaid! / item.wearCount!) * 100) / 100 }))
    .sort((a, b) => a.costPerWear - b.costPerWear)
    .slice(0, n)
}

export interface MonthBucket {
  month: string // YYYY-MM
  count: number
}

export function purchaseCadence(items: WardrobeItem[], months: number, nowIso: string): MonthBucket[] {
  const now = new Date(nowIso)
  const buckets: MonthBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    buckets.push({ month: d.toISOString().slice(0, 7), count: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.month, i]))
  for (const item of live(items)) {
    if (!item.purchasedAt) continue
    const key = item.purchasedAt.slice(0, 7)
    const at = index.get(key)
    if (at !== undefined) buckets[at].count++
  }
  return buckets
}

/** Items whose record is incomplete — each links straight to its edit (plan §9.8). */
export function incompleteItems(items: WardrobeItem[], n = 8): WardrobeItem[] {
  return owned(items)
    .filter((i) => i.pricePaid == null || !i.purchasedAt)
    .slice(0, n)
}
