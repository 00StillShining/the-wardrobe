import { create } from 'zustand'
import type { StyleSheet, SheetElement, WardrobeItem } from '../data/types'
import { localStorageAdapter as storage } from '../adapters/storage/StorageAdapter'
import { isStoredSheets } from '../adapters/storage/validation'

/**
 * Style-sheet state (Station 5). Sheets are edited as a draft (with undo/redo),
 * then exported to a PNG and pinned to the board. Metadata + element lists live
 * in localStorage; the flattened export PNG lives in IndexedDB behind a key.
 */

const SHEETS_KEY = 'sheets'
const pngKey = (id: string) => `sheetpng:${id}`

/* —— editorial auto-layout —— */

interface Slot {
  x: number
  y: number
  s: number
  r: number
}

// hand-tuned magazine arrangements so any selection reads composed on open
const TEMPLATES: Record<number, Slot[]> = {
  1: [{ x: 0.42, y: 0.5, s: 1.5, r: -2 }],
  2: [
    { x: 0.34, y: 0.52, s: 1.35, r: -2 },
    { x: 0.64, y: 0.46, s: 1.0, r: 3 },
  ],
  3: [
    { x: 0.3, y: 0.54, s: 1.35, r: -2 },
    { x: 0.58, y: 0.38, s: 0.95, r: 3 },
    { x: 0.7, y: 0.66, s: 0.82, r: -3 },
  ],
  4: [
    { x: 0.27, y: 0.54, s: 1.32, r: -2 },
    { x: 0.52, y: 0.36, s: 0.92, r: 3 },
    { x: 0.66, y: 0.62, s: 0.84, r: -2 },
    { x: 0.83, y: 0.78, s: 0.62, r: 4 },
  ],
  5: [
    { x: 0.28, y: 0.52, s: 1.34, r: -2 },
    { x: 0.15, y: 0.28, s: 0.72, r: 3 },
    { x: 0.5, y: 0.56, s: 1.02, r: -3 },
    { x: 0.68, y: 0.66, s: 0.74, r: 2 },
    { x: 0.84, y: 0.82, s: 0.6, r: -4 },
  ],
  6: [
    { x: 0.26, y: 0.5, s: 1.3, r: -2 },
    { x: 0.14, y: 0.26, s: 0.68, r: 3 },
    { x: 0.46, y: 0.34, s: 0.8, r: -2 },
    { x: 0.52, y: 0.64, s: 0.96, r: 3 },
    { x: 0.72, y: 0.5, s: 0.74, r: -3 },
    { x: 0.84, y: 0.78, s: 0.6, r: 4 },
  ],
  7: [
    { x: 0.24, y: 0.5, s: 1.26, r: -2 },
    { x: 0.13, y: 0.25, s: 0.64, r: 3 },
    { x: 0.42, y: 0.3, s: 0.76, r: -2 },
    { x: 0.5, y: 0.62, s: 0.92, r: 3 },
    { x: 0.68, y: 0.44, s: 0.72, r: -3 },
    { x: 0.78, y: 0.7, s: 0.66, r: 2 },
    { x: 0.88, y: 0.36, s: 0.5, r: -4 },
  ],
  8: [
    { x: 0.23, y: 0.5, s: 1.24, r: -2 },
    { x: 0.12, y: 0.24, s: 0.62, r: 3 },
    { x: 0.4, y: 0.28, s: 0.72, r: -2 },
    { x: 0.48, y: 0.62, s: 0.9, r: 3 },
    { x: 0.66, y: 0.4, s: 0.7, r: -3 },
    { x: 0.76, y: 0.68, s: 0.64, r: 2 },
    { x: 0.88, y: 0.32, s: 0.48, r: -4 },
    { x: 0.9, y: 0.6, s: 0.46, r: 3 },
  ],
}

// prefer big pieces as the hero, props last
const CATEGORY_RANK: Record<string, number> = {
  outerwear: 0,
  dress: 1,
  top: 2,
  bottom: 3,
  shoes: 4,
  bag: 5,
  accessory: 6,
}

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function autoLayout(items: WardrobeItem[]): SheetElement[] {
  const ordered = [...items].sort((a, b) => (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9))
  const n = Math.min(ordered.length, 8)
  const slots = TEMPLATES[n] ?? TEMPLATES[8]
  const els: SheetElement[] = ordered.slice(0, 8).map((item, i) => {
    const slot = slots[i] ?? { x: 0.5, y: 0.5, s: 0.7, r: 0 }
    return {
      id: uid('c'),
      kind: 'cutout',
      x: slot.x,
      y: slot.y,
      scale: slot.s,
      rotation: slot.r,
      z: i,
      itemId: item.id,
    }
  })

  // a small cluster of fabric swatches from the dominant palette colours
  const colours: string[] = []
  for (const it of ordered) {
    const c = it.palette[0]
    if (c && !colours.includes(c)) colours.push(c)
    if (colours.length >= 3) break
  }
  colours.forEach((color, i) => {
    els.push({
      id: uid('s'),
      kind: 'swatch',
      x: 0.8 + i * 0.06,
      y: 0.18 + i * 0.015,
      scale: 1,
      rotation: i % 2 ? 2 : -2,
      z: 20 + i,
      color,
    })
  })

  // a serif caption
  els.push({
    id: uid('t'),
    kind: 'caption',
    x: 0.17,
    y: 0.9,
    scale: 1,
    rotation: 0,
    z: 30,
    text: 'Autumn Capsule',
  })

  return els
}

/* —— store —— */

interface SheetsState {
  sheets: StyleSheet[]
  draft: StyleSheet | null
  past: SheetElement[][]
  future: SheetElement[][]
  init: () => void
  newFromItems: (items: WardrobeItem[]) => void
  open: (id: string) => void
  close: () => void
  setTitle: (t: string) => void
  updateEl: (id: string, patch: Partial<SheetElement>) => void
  commit: () => void // push current elements to history (call at drag/gesture start)
  addSwatch: (color: string) => void
  addCaption: () => void
  addImage: (imageKey: string) => void
  removeEl: (id: string) => void
  bring: (id: string, dir: 'front' | 'back') => void
  undo: () => void
  redo: () => void
  saveDraft: (pngBlob: Blob | null) => Promise<void>
  remove: (id: string) => Promise<void>
}

function persist(sheets: StyleSheet[]) {
  storage.writeJSON(SHEETS_KEY, sheets)
}

export const useSheets = create<SheetsState>()((set, get) => ({
  sheets: [],
  draft: null,
  past: [],
  future: [],

  init: () => {
    const saved = storage.readJSON<unknown>(SHEETS_KEY)
    if (isStoredSheets(saved)) set({ sheets: saved })
  },

  newFromItems: (items) => {
    const draft: StyleSheet = {
      id: uid('sheet'),
      title: 'Autumn Capsule',
      elements: autoLayout(items),
      createdAt: new Date().toISOString(),
    }
    set({ draft, past: [], future: [] })
  },

  open: (id) => {
    const sheet = get().sheets.find((s) => s.id === id)
    if (sheet) set({ draft: structuredClone(sheet), past: [], future: [] })
  },

  close: () => set({ draft: null, past: [], future: [] }),

  setTitle: (title) => {
    const d = get().draft
    if (d) set({ draft: { ...d, title } })
  },

  commit: () => {
    const d = get().draft
    if (d) set((s) => ({ past: [...s.past, structuredClone(d.elements)].slice(-40), future: [] }))
  },

  updateEl: (id, patch) => {
    const d = get().draft
    if (!d) return
    set({ draft: { ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } })
  },

  addSwatch: (color) => {
    const d = get().draft
    if (!d) return
    get().commit()
    const el: SheetElement = { id: uid('s'), kind: 'swatch', x: 0.5, y: 0.5, scale: 1, rotation: 0, z: nextZ(d.elements), color }
    set({ draft: { ...d, elements: [...d.elements, el] } })
  },

  addCaption: () => {
    const d = get().draft
    if (!d) return
    get().commit()
    const el: SheetElement = { id: uid('t'), kind: 'caption', x: 0.5, y: 0.5, scale: 1, rotation: 0, z: nextZ(d.elements), text: 'Caption' }
    set({ draft: { ...d, elements: [...d.elements, el] } })
  },

  addImage: (imageKey) => {
    const d = get().draft
    if (!d) return
    get().commit()
    const el: SheetElement = { id: uid('i'), kind: 'image', x: 0.5, y: 0.5, scale: 1, rotation: -2, z: nextZ(d.elements), imageKey }
    set({ draft: { ...d, elements: [...d.elements, el] } })
  },

  removeEl: (id) => {
    const d = get().draft
    if (!d) return
    get().commit()
    set({ draft: { ...d, elements: d.elements.filter((e) => e.id !== id) } })
  },

  bring: (id, dir) => {
    const d = get().draft
    if (!d) return
    get().commit()
    const zs = d.elements.map((e) => e.z)
    const z = dir === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1
    set({ draft: { ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, z } : e)) } })
  },

  undo: () => {
    const { draft, past } = get()
    if (!draft || !past.length) return
    const prev = past[past.length - 1]
    set((s) => ({
      draft: { ...draft, elements: prev },
      past: past.slice(0, -1),
      future: [structuredClone(draft.elements), ...s.future].slice(0, 40),
    }))
  },

  redo: () => {
    const { draft, future } = get()
    if (!draft || !future.length) return
    const next = future[0]
    set((s) => ({
      draft: { ...draft, elements: next },
      future: future.slice(1),
      past: [...s.past, structuredClone(draft.elements)].slice(-40),
    }))
  },

  saveDraft: async (pngBlob) => {
    const d = get().draft
    if (!d) return
    if (pngBlob) await storage.putBlob(pngKey(d.id), pngBlob)
    const saved: StyleSheet = { ...d, exportPng: pngBlob ? pngKey(d.id) : d.exportPng }
    const others = get().sheets.filter((s) => s.id !== d.id)
    const sheets = [saved, ...others]
    persist(sheets)
    set({ sheets, draft: null, past: [], future: [] })
  },

  remove: async (id) => {
    await storage.delBlob(pngKey(id))
    const sheets = get().sheets.filter((s) => s.id !== id)
    persist(sheets)
    set({ sheets })
  },
}))

function nextZ(els: SheetElement[]): number {
  return els.length ? Math.max(...els.map((e) => e.z)) + 1 : 0
}

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__sheets = useSheets
}
