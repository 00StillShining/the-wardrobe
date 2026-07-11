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

/**
 * Lantern framings — redesigned to the Midjourney desktop-layout frames:
 * frontal, formal, gallery-lit. Positions are authored full-frame; the rig
 * view-offsets each into the visible left 62% when the workspace is open, so
 * the hero object lands centred in the pane rather than the full window.
 */
export const STATIONS: Record<StationId, Station> = {
  // hero: the whole lantern, generous, straight-on (master-style frame)
  overview: { id: 'overview', pos: { x: 0.2, y: 1.34, z: 5.15 }, tgt: { x: -0.15, y: 1.28, z: 0.35 } },
  // gallery rhythm: straight-on across the wardrobe, pulled back so the
  // bright bay reads as one lit panel among the linen (desktop-collection)
  collection: { id: 'collection', pos: { x: -0.1, y: 1.4, z: 4.35 }, tgt: { x: -0.15, y: 1.3, z: 0.4 } },
  // formal hero: full leaning mirror with room to breathe (desktop-outfit)
  outfits: { id: 'outfits', pos: { x: -1.45, y: 1.24, z: 3.7 }, tgt: { x: -1.86, y: 1.02, z: 0.45 }, onDoor: true },
  // frontal on the golden cane slide, centred with breathing room
  style: { id: 'style', pos: { x: 0.6, y: 1.32, z: 3.75 }, tgt: { x: 0.9, y: 1.22, z: 0.42 }, onDoor: true },
  // ledger view: closer, steeper look-down so the felt + ruler fill the
  // frame and the floor drops away (frame 05)
  insights: { id: 'insights', pos: { x: 0.25, y: 1.5, z: 1.95 }, tgt: { x: 0.05, y: 0.08, z: 0.78 } },
  // close on the lit tray of photos, looking slightly down (post-tray frame)
  import: { id: 'import', pos: { x: 1.15, y: 1.5, z: 2.35 }, tgt: { x: 1.62, y: 0.98, z: 0.12 } },
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
  if (fromDoor || toDoor) return { move: 'arc', dur: 1.15, delay: 0 }
  if (to === 'import' || from === 'import') return { move: 'pedestal', dur: 0.95, delay: 0 }
  if (to === 'overview' || from === 'overview') return { move: 'pull', dur: 1.3, delay: 0 }
  return { move: 'dolly', dur: 1.0, delay: 0 }
}

/** Fraction of the content area the scene composes for when the workspace is open. */
export const SAFE_FRACTION = 0.62
