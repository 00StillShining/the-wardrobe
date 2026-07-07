import type { PriceListing } from '../../data/types'

/**
 * Price-comparison boundary (spec §4). MockPriceAdapter fabricates realistic
 * cross-shop listings deterministically from the item id, so the Ledger drawer
 * has honest-looking stationery to render. A real integration (retail search
 * API / affiliate feed) can replace this behind the same interface.
 */
export interface PriceAdapter {
  /** listings across shops for an item, plus a short price history sparkline */
  getListings(itemId: string, pricePaid?: number): Promise<PriceListing[]>
  getHistory(itemId: string, pricePaid?: number): Promise<number[]>
}

const SHOPS = ['Fellow & Co.', 'Maison Vert', 'Northgate Dept.', 'Bruno Atelier', 'The Row House', 'Atelier Doré']

/** deterministic pseudo-random from a string seed */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHECK_DATES = ['3 Jul', '1 Jul', '28 Jun', '25 Jun', '2 Jul', '30 Jun']

export const mockPriceAdapter: PriceAdapter = {
  async getListings(itemId, pricePaid = 120) {
    const rnd = seeded(itemId)
    const count = 3 + Math.floor(rnd() * 3) // 3–5 shops
    const shops = [...SHOPS].sort(() => rnd() - 0.5).slice(0, count)
    return shops.map((shop, i) => {
      // spread listings around what was paid: −18% … +12%
      const delta = -0.18 + rnd() * 0.3
      const price = Math.round(pricePaid * (1 + delta))
      return {
        shop,
        price,
        url: '#',
        checkedAt: CHECK_DATES[i % CHECK_DATES.length],
      }
    })
  },
  async getHistory(itemId, pricePaid = 120) {
    const rnd = seeded(itemId + ':hist')
    const points: number[] = []
    let v = pricePaid * (1 + (rnd() - 0.5) * 0.2)
    for (let i = 0; i < 12; i++) {
      v += (rnd() - 0.5) * pricePaid * 0.08
      v = Math.max(pricePaid * 0.7, Math.min(pricePaid * 1.25, v))
      points.push(Math.round(v))
    }
    return points
  },
}
