import { create } from 'zustand'
import { stationForPath, type StationId } from '../scene/stations'

export type DoorPhase = 'closed' | 'opening' | 'open'
export type ViewMode = 'full' | 'split'

interface SceneState {
  station: StationId
  /** overview composes full-frame; feature routes compose for the left 62% */
  viewMode: ViewMode
  /** monotonic time (s) the current station was set — drives choreography */
  tStation: number
  doorPhase: DoorPhase
  /** monotonic time (s) the doors began opening */
  tDoors: number
  /** deep-linked/first destination consumed by _arrive() after the door ritual */
  pendingStation: StationId | null
  drawerOpen: boolean
  fullMotion: boolean
  /** bumps on every reduced-motion cut — the shell shows a 300 ms veil */
  cutSerial: number
  /** true when the current route has no scene (settings/fixtures) — pauses rendering */
  paused: boolean
  routeChanged: (pathname: string) => void
  _arrive: (station: StationId) => void
  setFullMotion: (v: boolean) => void
}

const now = () => performance.now() / 1000

function resolveFullMotion(): boolean {
  if (typeof window === 'undefined') return true
  const override = new URLSearchParams(window.location.search).get('motion')
  if (override === 'full') return true
  if (override === 'reduced') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const useScene = create<SceneState>((set, get) => ({
  station: 'overview',
  viewMode: 'full',
  tStation: now(),
  doorPhase: 'closed',
  tDoors: 0,
  pendingStation: null,
  drawerOpen: false,
  fullMotion: resolveFullMotion(),
  cutSerial: 0,
  paused: false,

  routeChanged: (pathname) => {
    const target = stationForPath(pathname)
    if (target === null) {
      set({ paused: true })
      return
    }
    const s = get()
    // every scene route composes into the visible left region — overview's
    // hero/destination panel occupies the right 38% just like workspaces
    const patch: Partial<SceneState> = { paused: false, viewMode: 'split' }

    if (target === s.station && !s.paused) {
      set(patch)
      return
    }

    // door ritual: first departure from the closed overview opens the doors,
    // and the camera waits for the anticipation beat (v1: doors lead by 250 ms)
    if (s.doorPhase === 'closed' && target !== 'overview') {
      set({ ...patch, doorPhase: 'opening', tDoors: now(), pendingStation: target })
      if (!s.fullMotion) {
        // reduced motion: no choreography, cut straight through
        get()._arrive(target)
      }
      return
    }

    set({
      ...patch,
      station: target,
      tStation: now(),
      drawerOpen: target === 'insights',
      cutSerial: s.fullMotion ? s.cutSerial : s.cutSerial + 1,
    })
  },

  _arrive: (station) => {
    set((s) => ({
      station,
      tStation: now(),
      pendingStation: null,
      doorPhase: 'open',
      drawerOpen: station === 'insights',
      cutSerial: s.fullMotion ? s.cutSerial : s.cutSerial + 1,
    }))
  },

  setFullMotion: (v) => set({ fullMotion: v }),
}))

// dev handle for preview tooling and e2e (same pattern as v1's window.__nav)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__scene = useScene
}
