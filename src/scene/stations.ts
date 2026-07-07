import * as THREE from 'three'

/**
 * The spatial map — this IS the information architecture.
 * Seven stations, each a physical spot inside one continuous scene.
 * Framings assume the doors are open (every station except `doors`
 * is only reachable after entry).
 */

export const STATION_ORDER = ['doors', 'rail', 'shelves', 'mirror', 'ledger', 'pinboard', 'post'] as const
export type StationId = (typeof STATION_ORDER)[number]

export interface Framing {
  pos: THREE.Vector3
  tgt: THREE.Vector3
  name: string
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export const STATIONS: Record<StationId, Framing> = {
  doors: { name: 'The Doors', pos: v(0.42, 1.45, 4.95), tgt: v(0, 1.21, 0) },
  rail: { name: 'The Rail', pos: v(0.02, 1.34, 2.75), tgt: v(0, 1.18, -0.2) },
  shelves: { name: 'The Shelves', pos: v(-0.33, 1.28, 2.0), tgt: v(-0.5, 1.14, -0.05) },
  mirror: { name: 'The Mirror', pos: v(1.34, 1.16, 1.02), tgt: v(-0.82, 1.06, -0.05) },
  ledger: { name: 'The Ledger', pos: v(0, 1.18, 1.9), tgt: v(0, 0.38, 0.35) },
  pinboard: { name: 'The Pinboard', pos: v(-1.85, 1.28, 2.05), tgt: v(0.76, 1.21, 0.62) },
  post: { name: 'The Post Tray', pos: v(0.15, 2.05, 1.8), tgt: v(0.26, 1.85, -0.02) },
}

/** The move library (§2 of the motion spec). Variety is assigned, never random. */
export type Move = 'dolly' | 'crane' | 'pedestal' | 'arc' | 'pull'

export interface TransitionSpec {
  move: Move
  dur: number
  /** seconds the scene reacts before the camera departs (anticipation) */
  delay: number
}

const onDoor = (s: StationId) => s === 'mirror' || s === 'pinboard'

/** TRANSITIONS[from][to], expressed as precedence rules. */
export function transitionFor(from: StationId, to: StationId): TransitionSpec {
  // Crane-Down to the ledger — the drawer slides open during the descent,
  // and it starts moving before the camera does.
  if (to === 'ledger') return { move: 'crane', dur: 1.0, delay: 0.22 }
  if (from === 'ledger') return { move: 'crane', dur: 1.0, delay: 0 }
  // Arc Swing to surfaces that live on the open doors
  if (onDoor(from) && onDoor(to)) return { move: 'arc', dur: 1.35, delay: 0 }
  if (onDoor(from) || onDoor(to)) return { move: 'arc', dur: 1.2, delay: 0 }
  // Pedestal-Rise up to the post tray
  if (to === 'post' || from === 'post') return { move: 'pedestal', dur: 0.95, delay: 0 }
  // Pull-Back Reveal out to the wide overview
  if (to === 'doors' || from === 'doors') return { move: 'pull', dur: 1.3, delay: 0 }
  // Short lateral hops feel snappy
  if ((from === 'rail' && to === 'shelves') || (from === 'shelves' && to === 'rail'))
    return { move: 'dolly', dur: 0.85, delay: 0 }
  return { move: 'dolly', dur: 1.1, delay: 0 }
}
