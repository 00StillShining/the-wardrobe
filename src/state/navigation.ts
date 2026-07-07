import { create } from 'zustand'

/**
 * Navigation state machine.
 * Phase 0 knows two stations (doors, rail) and the door choreography.
 * The station registry proper arrives in Phase 1 — this slice is
 * already shaped for it (stations are string ids, transitions are
 * timestamped so the scene can choreograph against the clock).
 */

export type StationId = 'doors' | 'rail'
export type DoorPhase = 'closed' | 'unlocking' | 'opening' | 'open'

/** True when the user prefers reduced motion AND hasn't overridden it. */
export function resolveFullMotion(): boolean {
  const params = new URLSearchParams(window.location.search)
  const override = params.get('motion')
  if (override === 'full') return true
  if (override === 'reduced') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface NavState {
  station: StationId
  doorPhase: DoorPhase
  /** performance.now()/1000 timestamps for choreography */
  tUnlock: number
  tOpen: number
  fullMotion: boolean
  /** bumps when a reduced-motion cut needs a crossfade veil */
  cutSerial: number
  enter: () => void
  _setDoorPhase: (p: DoorPhase, t?: number) => void
  _arrive: (s: StationId) => void
}

const now = () => performance.now() / 1000

export const useNav = create<NavState>()((set, get) => ({
  station: 'doors',
  doorPhase: 'closed',
  tUnlock: 0,
  tOpen: 0,
  fullMotion: resolveFullMotion(),
  cutSerial: 0,

  enter: () => {
    const { doorPhase, fullMotion } = get()
    if (doorPhase !== 'closed') return
    if (fullMotion) {
      set({ doorPhase: 'unlocking', tUnlock: now() })
    } else {
      // Reduced motion: crossfade cut straight to the open interior.
      set((s) => ({
        doorPhase: 'open',
        station: 'rail',
        tUnlock: now(),
        tOpen: now(),
        cutSerial: s.cutSerial + 1,
      }))
    }
  },

  _setDoorPhase: (p, t) =>
    set((s) => ({
      doorPhase: p,
      tOpen: p === 'opening' ? (t ?? now()) : s.tOpen,
    })),

  _arrive: (s) => set({ station: s }),
}))

// Dev handle for driving the scene from the console / preview tooling
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__nav = useNav
}
