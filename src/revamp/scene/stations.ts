/**
 * Station registry — the route↔camera contract (plan §12.2, cabinet-plan.md).
 * Framings are authored full-frame; the rig view-offsets them into the visible
 * scene region when the workspace panel is open.
 */

export type StationId = 'overview' | 'collection' | 'outfits' | 'style' | 'insights' | 'import'

export type MoveKind = 'dolly' | 'arc' | 'crane' | 'pedestal' | 'pull'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Station {
  id: StationId
  pos: Vec3
  tgt: Vec3
  /** stations living on an open door surface get arc moves between them */
  onDoor?: boolean
}

export const STATIONS: Record<StationId, Station> = {
  overview: { id: 'overview', pos: { x: 0.55, y: 1.42, z: 4.15 }, tgt: { x: 0, y: 1.2, z: 0.4 } },
  collection: { id: 'collection', pos: { x: -0.2, y: 1.45, z: 4.4 }, tgt: { x: -0.25, y: 1.2, z: 0.4 } },
  // door-surface targets sit at the OPEN door centres (hinge ±1.09, 107°):
  // centre ≈ (±1.22, 1.2, 1.03) — computed in cabinet-plan.md geometry
  outfits: { id: 'outfits', pos: { x: 1.0, y: 1.4, z: 4.2 }, tgt: { x: -1.22, y: 1.15, z: 1.03 }, onDoor: true },
  style: { id: 'style', pos: { x: -1.0, y: 1.4, z: 4.2 }, tgt: { x: 1.22, y: 1.18, z: 1.03 }, onDoor: true },
  insights: { id: 'insights', pos: { x: 0.3, y: 1.55, z: 2.75 }, tgt: { x: -0.3, y: 0.48, z: 0.5 } },
  import: { id: 'import', pos: { x: -0.45, y: 1.3, z: 2.65 }, tgt: { x: -1.31, y: 0.98, z: 0.45 } },
}

/** Route prefix → station. Longest match wins (settings/fixtures have no station). */
const ROUTE_STATIONS: Array<[string, StationId]> = [
  ['/app/collection', 'collection'],
  ['/app/outfits', 'outfits'],
  ['/app/style', 'style'],
  ['/app/insights', 'insights'],
  ['/app/import', 'import'],
  ['/app', 'overview'],
]

export function stationForPath(pathname: string): StationId | null {
  if (pathname.startsWith('/app/settings') || pathname.startsWith('/app/fixtures')) return null
  const hit = ROUTE_STATIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return hit ? hit[1] : pathname === '/app' ? 'overview' : null
}

export interface TransitionSpec {
  move: MoveKind
  /** seconds */
  dur: number
  /** camera departure delay — the scene anticipates first (doors, drawer) */
  delay: number
}

/**
 * Variety is assigned by journey geometry, never random (v1 transitionFor,
 * durations per the motion spec: 0.7–0.9 adjacent, 1.0–1.2 standard, 1.4 cap).
 */
export function transitionFor(from: StationId, to: StationId): TransitionSpec {
  if (to === 'insights') return { move: 'crane', dur: 1.0, delay: 0.22 }
  if (from === 'insights') return { move: 'crane', dur: 1.0, delay: 0 }
  const fromDoor = STATIONS[from].onDoor
  const toDoor = STATIONS[to].onDoor
  if (fromDoor && toDoor) return { move: 'arc', dur: 1.35, delay: 0 }
  if (fromDoor || toDoor) return { move: 'arc', dur: 1.2, delay: 0 }
  if (to === 'import' || from === 'import') return { move: 'pedestal', dur: 0.95, delay: 0 }
  if (to === 'overview' || from === 'overview') return { move: 'pull', dur: 1.3, delay: 0 }
  return { move: 'dolly', dur: 1.1, delay: 0 }
}

/** Fraction of the content area the scene composes for when the workspace is open. */
export const SAFE_FRACTION = 0.62
