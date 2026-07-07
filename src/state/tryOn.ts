import { create } from 'zustand'
import type { GarmentTemplate } from '../data/types'

/**
 * Try-on state (Station 3). `worn` is the ordered list of item ids currently
 * on the dress form; layering is derived from each item's template slot so a
 * dress sits under a coat, etc. `spin` is the drag-rotation of the form.
 */

/** fixed layer slots — lower dresses first, outerwear last (renderOrder) */
export const LAYER_SLOT: Record<GarmentTemplate, number> = {
  dress: 0,
  skirt: 0,
  pants: 0,
  shorts: 0,
  tee: 1,
  shirt: 1,
  knit: 2,
  hoodie: 2,
  jacket: 3,
  coat: 4,
  prop: 5,
}

interface TryOnState {
  worn: string[]
  setWorn: (ids: string[]) => void
  toggleWorn: (id: string) => void
  clearWorn: () => void
}

export const useTryOn = create<TryOnState>()((set, get) => ({
  worn: [],
  setWorn: (ids) => set({ worn: [...ids] }),
  toggleWorn: (id) => {
    const worn = get().worn
    set({ worn: worn.includes(id) ? worn.filter((w) => w !== id) : [...worn, id] })
  },
  clearWorn: () => set({ worn: [] }),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__tryOn = useTryOn
}
