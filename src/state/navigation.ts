import { create } from 'zustand'
import { STATION_ORDER, type StationId } from '../scene/stations'

export type { StationId }
export type DoorPhase = 'closed' | 'unlocking' | 'opening' | 'open'

/** True unless the user prefers reduced motion (overridable via ?motion=). */
export function resolveFullMotion(): boolean {
  const params = new URLSearchParams(window.location.search)
  const override = params.get('motion')
  if (override === 'full') return true
  if (override === 'reduced') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const now = () => performance.now() / 1000

const isStation = (s: string): s is StationId => (STATION_ORDER as readonly string[]).includes(s)

interface NavState {
  station: StationId
  /** when the station last changed — hotspot glints + choreography key off this */
  tStation: number
  /** deep-linked destination to fly to once the doors are open */
  pendingStation: StationId | null
  doorPhase: DoorPhase
  tUnlock: number
  tOpen: number
  fullMotion: boolean
  /** bumps when a reduced-motion cut needs a crossfade veil */
  cutSerial: number
  enter: () => void
  navigate: (s: StationId) => void
  _setDoorPhase: (p: DoorPhase, t?: number) => void
  /** consume pendingStation at the end of the door choreography */
  _arrive: () => void
}

export const useNav = create<NavState>()((set, get) => ({
  station: 'doors',
  tStation: 0,
  pendingStation: null,
  doorPhase: 'closed',
  tUnlock: 0,
  tOpen: 0,
  fullMotion: resolveFullMotion(),
  cutSerial: 0,

  enter: () => {
    const { doorPhase, fullMotion, pendingStation } = get()
    if (doorPhase !== 'closed') return
    if (fullMotion) {
      set({ doorPhase: 'unlocking', tUnlock: now() })
    } else {
      // Reduced motion: crossfade cut straight to the open interior.
      set((s) => ({
        doorPhase: 'open',
        station: pendingStation ?? 'rail',
        pendingStation: null,
        tStation: now(),
        tUnlock: now(),
        tOpen: now(),
        cutSerial: s.cutSerial + 1,
      }))
    }
  },

  navigate: (s) => {
    const st = get()
    if (!isStation(s) || s === st.station) return
    // Doors still shut (closed/unlocking): remember the wish for _arrive.
    // Once they're swinging, flights are interruptible as usual.
    if (st.doorPhase === 'closed' || st.doorPhase === 'unlocking') {
      if (s !== 'doors') set({ pendingStation: s })
      return
    }
    if (st.fullMotion) {
      set({ station: s, tStation: now() })
    } else {
      set((prev) => ({ station: s, tStation: now(), cutSerial: prev.cutSerial + 1 }))
    }
  },

  _setDoorPhase: (p, t) =>
    set((s) => ({
      doorPhase: p,
      tOpen: p === 'opening' ? (t ?? now()) : s.tOpen,
    })),

  _arrive: () =>
    set((s) => ({
      station: s.pendingStation ?? 'rail',
      pendingStation: null,
      tStation: now(),
    })),
}))

/**
 * Hash routing: #rail, #mirror, … ↔ nav state. Plain hash assignment pushes
 * history entries, so browser back/forward drive the same transition grammar.
 */
export function initHashSync() {
  const apply = () => {
    const h = window.location.hash.replace('#', '') || 'doors'
    if (!isStation(h)) return
    const st = useNav.getState()
    if (h !== st.station) st.navigate(h)
  }
  window.addEventListener('hashchange', apply)

  // Deep link on first load: keep the door ritual, fly there after entry.
  const initial = window.location.hash.replace('#', '')
  if (isStation(initial) && initial !== 'doors') {
    useNav.setState({ pendingStation: initial })
  }

  // Only write the hash when the station itself changes — a naive subscriber
  // would clobber a deep-link hash on the first unrelated state change.
  let lastWritten = useNav.getState().station
  useNav.subscribe((s) => {
    if (s.station === lastWritten) return
    lastWritten = s.station
    const target = `#${s.station}`
    if (window.location.hash !== target) window.location.hash = target
  })
}

// Dev handle for driving the scene from the console / preview tooling
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__nav = useNav
}
