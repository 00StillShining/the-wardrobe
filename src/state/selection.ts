import { create } from 'zustand'

/**
 * Selection + focus. `focused` is the single garment slid forward under the
 * rail spotlight; `selected` is the multi-select set that feeds the linen
 * tray → Try-on (Station 3) and New style sheet (Station 5).
 */
interface SelectionState {
  focused: string | null
  selectMode: boolean
  selected: Set<string>
  setFocused: (id: string | null) => void
  toggleSelectMode: () => void
  toggleSelected: (id: string) => void
  clearSelected: () => void
}

export const useSelection = create<SelectionState>()((set, get) => ({
  focused: null,
  selectMode: false,
  selected: new Set(),
  setFocused: (id) => set({ focused: id }),
  toggleSelectMode: () =>
    set((s) => ({ selectMode: !s.selectMode, selected: s.selectMode ? new Set() : s.selected, focused: null })),
  toggleSelected: (id) => {
    const selected = new Set(get().selected)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    set({ selected })
  },
  clearSelected: () => set({ selected: new Set() }),
}))
