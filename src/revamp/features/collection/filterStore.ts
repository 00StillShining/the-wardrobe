import { create } from 'zustand'
import type { WardrobeSort } from '../../services/contracts'

/**
 * Collection context that must survive navigation (plan §9.3: returning from
 * detail restores filters and scroll). Insights drills in by presetting this
 * store before navigating (plan §9.8).
 */

export type Ownership = 'all' | 'owned' | 'wishlist' | 'archived'
export type CollectionViewMode = 'grid' | 'rail' | 'list'

export const CATEGORY_OPTIONS = [
  'outerwear',
  'knitwear',
  'tops',
  'trousers',
  'skirts',
  'dresses',
  'shoes',
  'accessories',
] as const

export const SEASON_OPTIONS = ['spring', 'summer', 'autumn', 'winter'] as const
export const OCCASION_OPTIONS = ['everyday', 'work', 'evening', 'sport', 'occasion'] as const

interface CollectionFilters {
  search: string
  ownership: Ownership
  category: string // '' = all
  season: string
  occasion: string
  sort: WardrobeSort
  view: CollectionViewMode
  scrollTop: number
  selectMode: boolean
  selected: Set<string>
  set: (patch: Partial<Omit<CollectionFilters, 'set' | 'reset' | 'toggleSelected' | 'activeCount'>>) => void
  reset: () => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
  activeCount: () => number
}

const DEFAULTS = {
  search: '',
  ownership: 'all' as Ownership,
  category: '',
  season: '',
  occasion: '',
  sort: 'newest' as WardrobeSort,
  view: 'grid' as CollectionViewMode,
  scrollTop: 0,
  selectMode: false,
  selected: new Set<string>(),
}

export const useCollectionFilters = create<CollectionFilters>((set, get) => ({
  ...DEFAULTS,
  set: (patch) => set(patch),
  reset: () => set({ ...DEFAULTS, selected: new Set(), view: get().view }),
  toggleSelected: (id) =>
    set((s) => {
      const next = new Set(s.selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selected: next }
    }),
  clearSelection: () => set({ selected: new Set(), selectMode: false }),
  activeCount: () => {
    const s = get()
    let n = 0
    if (s.search.trim()) n++
    if (s.ownership !== 'all') n++
    if (s.category) n++
    if (s.season) n++
    if (s.occasion) n++
    return n
  },
}))
