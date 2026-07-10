import { create } from 'zustand'
import type { BoardElementDoc } from './boardModel'

/**
 * Transient board-editor state (plan §9.7): bounded undo/redo, selection,
 * zoom, and a save-state indicator. Persistence flows through
 * StyleBoardRepository (autosave debounced in the editor).
 */

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error'

interface BoardEditor {
  boardId: string | null
  title: string
  elements: BoardElementDoc[]
  selectedId: string | null
  past: BoardElementDoc[][]
  future: BoardElementDoc[][]
  saveState: SaveState
  zoom: number
  load: (boardId: string, title: string, elements: BoardElementDoc[]) => void
  setTitle: (title: string) => void
  apply: (elements: BoardElementDoc[]) => void
  patchElement: (id: string, patch: Partial<BoardElementDoc>) => void
  select: (id: string | null) => void
  undo: () => void
  redo: () => void
  setSaveState: (s: SaveState) => void
  setZoom: (z: number) => void
}

const HISTORY_LIMIT = 40

export const useBoardEditor = create<BoardEditor>((set, get) => ({
  boardId: null,
  title: '',
  elements: [],
  selectedId: null,
  past: [],
  future: [],
  saveState: 'saved',
  zoom: 1,

  load: (boardId, title, elements) =>
    set({ boardId, title, elements, selectedId: null, past: [], future: [], saveState: 'saved' }),

  setTitle: (title) => set({ title, saveState: 'dirty' }),

  apply: (elements) =>
    set((s) => ({
      elements,
      past: [...s.past.slice(-HISTORY_LIMIT + 1), s.elements],
      future: [],
      saveState: 'dirty',
    })),

  patchElement: (id, patch) => {
    const next = get().elements.map((e) => (e.id === id ? { ...e, ...patch } : e))
    get().apply(next)
  },

  select: (id) => set({ selectedId: id }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return s
      return { elements: prev, past: s.past.slice(0, -1), future: [s.elements, ...s.future], saveState: 'dirty' }
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return s
      return { elements: next, past: [...s.past, s.elements], future: s.future.slice(1), saveState: 'dirty' }
    }),

  setSaveState: (saveState) => set({ saveState }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
}))

// dev handle for e2e position assertions
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__board = useBoardEditor
}
