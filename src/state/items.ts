import { create } from 'zustand'
import type { WardrobeItem, ReceiptLineItem } from '../data/types'
import { CAPSULE } from '../data/seeds/capsule'
import { illustrateToBlob } from '../scene/garments/illustrate'
import { workerImageAdapter } from '../adapters/images/ImageAdapter'
import { localStorageAdapter as storage } from '../adapters/storage/StorageAdapter'

export type Filter = 'all' | 'owned' | 'wishlist'

const ITEMS_KEY = 'items'
const SEEDED_KEY = 'seeded'

const origKey = (id: string) => `orig:${id}`
const cutKey = (id: string) => `cut:${id}`

interface ItemsState {
  items: WardrobeItem[]
  ready: boolean
  seeding: boolean
  importing: Set<string>
  filter: Filter
  init: () => Promise<void>
  importLine: (line: ReceiptLineItem, receiptId: string) => Promise<WardrobeItem | null>
  toggleOwned: (id: string) => void
  remove: (id: string) => void
  setFilter: (f: Filter) => void
}

function persist(items: WardrobeItem[]) {
  storage.writeJSON(ITEMS_KEY, items)
}

async function blobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url)
  return await res.blob()
}

export const useItems = create<ItemsState>()((set, get) => ({
  items: [],
  ready: false,
  seeding: false,
  importing: new Set(),
  filter: 'all',

  init: async () => {
    if (get().ready || get().seeding) return
    const saved = storage.readJSON<WardrobeItem[]>(ITEMS_KEY)
    if (saved && saved.length) {
      set({ items: saved, ready: true })
      return
    }
    // First run — seed the capsule through the real cutout pipeline.
    set({ seeding: true })
    const built: WardrobeItem[] = []
    for (const spec of CAPSULE) {
      try {
        const original = await illustrateToBlob(spec.shape, spec.colors)
        const { cutout, palette } = await workerImageAdapter.process(original)
        await storage.putBlob(origKey(spec.id), original)
        await storage.putBlob(cutKey(spec.id), cutout)
        const item: WardrobeItem = {
          id: spec.id,
          name: spec.name,
          brand: spec.brand,
          category: spec.category,
          template: spec.template,
          owned: spec.owned,
          images: { original: origKey(spec.id), cutout: cutKey(spec.id) },
          palette,
          pricePaid: spec.pricePaid,
          currency: 'GBP',
          source: { merchant: spec.merchant, addedAt: '2026-06-01' },
        }
        built.push(item)
        // stream items onto the rail as they finish
        set({ items: [...built] })
      } catch (e) {
        console.warn('[seed] failed', spec.id, e)
      }
    }
    storage.writeJSON(SEEDED_KEY, true)
    persist(built)
    set({ items: built, seeding: false, ready: true })
  },

  importLine: async (line, receiptId) => {
    const id = `item-${crypto.randomUUID().slice(0, 8)}`
    set((s) => ({ importing: new Set(s.importing).add(id) }))
    try {
      const original = await blobFromUrl(line.imageUrl)
      const { cutout, palette } = await workerImageAdapter.process(original)
      await storage.putBlob(origKey(id), original)
      await storage.putBlob(cutKey(id), cutout)
      const item: WardrobeItem = {
        id,
        name: line.name,
        brand: line.brand,
        category: line.category,
        template: line.template,
        owned: true,
        images: { original: origKey(id), cutout: cutKey(id) },
        palette,
        pricePaid: line.price,
        currency: line.currency,
        source: { receiptId, merchant: line.brand, addedAt: new Date().toISOString().slice(0, 10) },
      }
      const items = [...get().items, item]
      persist(items)
      set((s) => {
        const importing = new Set(s.importing)
        importing.delete(id)
        return { items, importing }
      })
      return item
    } catch (e) {
      console.warn('[import] failed', line.name, e)
      set((s) => {
        const importing = new Set(s.importing)
        importing.delete(id)
        return { importing }
      })
      return null
    }
  },

  toggleOwned: (id) => {
    const items = get().items.map((it) => (it.id === id ? { ...it, owned: !it.owned } : it))
    persist(items)
    set({ items })
  },

  remove: (id) => {
    const items = get().items.filter((it) => it.id !== id)
    persist(items)
    storage.delBlob(origKey(id))
    storage.delBlob(cutKey(id))
    set({ items })
  },

  setFilter: (filter) => set({ filter }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__items = useItems
}
