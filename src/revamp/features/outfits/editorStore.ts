import { create } from 'zustand'
import type { LayerSlot } from './layerModel'

/**
 * Transient outfit-editor state with bounded undo/redo (plan §9.6).
 * Persistence goes through OutfitRepository on explicit save.
 */

export interface EditorLayer {
  itemId: string
  layerSlot: LayerSlot
  sortOrder: number
  hidden?: boolean
}

interface OutfitEditor {
  outfitId: string | null
  name: string
  occasion: string
  season: string
  layers: EditorLayer[]
  past: EditorLayer[][]
  future: EditorLayer[][]
  dirty: boolean
  load: (outfitId: string | null, name: string, layers: EditorLayer[], meta?: { occasion?: string; season?: string }) => void
  setMeta: (patch: Partial<Pick<OutfitEditor, 'name' | 'occasion' | 'season'>>) => void
  apply: (layers: EditorLayer[]) => void
  undo: () => void
  redo: () => void
  clear: () => void
  markSaved: (outfitId: string) => void
}

const HISTORY_LIMIT = 40

export const useOutfitEditor = create<OutfitEditor>((set, get) => ({
  outfitId: null,
  name: '',
  occasion: '',
  season: '',
  layers: [],
  past: [],
  future: [],
  dirty: false,

  load: (outfitId, name, layers, meta) =>
    set({
      outfitId,
      name,
      occasion: meta?.occasion ?? '',
      season: meta?.season ?? '',
      layers,
      past: [],
      future: [],
      dirty: false,
    }),

  setMeta: (patch) => set({ ...patch, dirty: true }),

  apply: (layers) =>
    set((s) => ({
      layers,
      past: [...s.past.slice(-HISTORY_LIMIT + 1), s.layers],
      future: [],
      dirty: true,
    })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return s
      return { layers: prev, past: s.past.slice(0, -1), future: [s.layers, ...s.future], dirty: true }
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return s
      return { layers: next, past: [...s.past, s.layers], future: s.future.slice(1), dirty: true }
    }),

  clear: () => get().apply([]),

  markSaved: (outfitId) => set({ outfitId, dirty: false }),
}))
