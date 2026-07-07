import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useNav } from '../state/navigation'
import { STATIONS, transitionFor, type StationId, type Move } from './stations'
import { easeCamera, clamp01 } from './easing'

/**
 * Manual camera rig implementing the house grammar: dolly-pan along a
 * quadratic bézier arc, target leading the camera by 80ms, 2% settle
 * overshoot, then idle life (breathing dolly + mouse parallax).
 * Transitions are interruptible — a new destination retargets from the
 * camera's current position, never queues, never snaps.
 */

const ROOM_CENTRE = new THREE.Vector3(0, 1.5, 2.4)
const TARGET_LEAD = 0.08
const OVERSHOOT = 0.02

function arcPoint(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, ctrl: THREE.Vector3, u: number) {
  const w = 1 - u
  out.set(
    w * w * a.x + 2 * w * u * ctrl.x + u * u * b.x,
    w * w * a.y + 2 * w * u * ctrl.y + u * u * b.y,
    w * w * a.z + 2 * w * u * ctrl.z + u * u * b.z,
  )
  return out
}

function overshootU(k: number): number {
  if (k >= 1) return 1
  const apex = 0.86
  if (k < apex) return easeCamera(k / apex) * (1 + OVERSHOOT)
  return 1 + OVERSHOOT * (1 - easeCamera((k - apex) / (1 - apex)))
}

/** Shape the bézier control point by move type (§2 move library). */
function shapeCtrl(move: Move, from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const mid = from.clone().add(to).multiplyScalar(0.5)
  switch (move) {
    case 'arc':
      // wide lateral swing out through the room
      mid.lerp(ROOM_CENTRE, 0.45)
      mid.y += 0.1
      mid.z += 0.35
      break
    case 'crane':
      // hold height early, descend late, drift forward
      mid.lerp(ROOM_CENTRE, 0.15)
      mid.y = from.y * 0.35 + to.y * 0.65
      mid.z += 0.25
      break
    case 'pedestal':
      // vertical rise with slight push toward the viewer
      mid.lerp(ROOM_CENTRE, 0.15)
      mid.y += 0.05
      mid.z += 0.2
      break
    case 'pull':
      // near-straight reverse dolly
      mid.lerp(ROOM_CENTRE, 0.12)
      mid.y += 0.08
      break
    default:
      mid.lerp(ROOM_CENTRE, 0.3)
      mid.y += 0.12
  }
  return mid
}

interface Flight {
  fromPos: THREE.Vector3
  fromTgt: THREE.Vector3
  toPos: THREE.Vector3
  toTgt: THREE.Vector3
  ctrlPos: THREE.Vector3
  ctrlTgt: THREE.Vector3
  startAt: number
  dur: number
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const lastStation = useRef<StationId>('doors')
  const flight = useRef<Flight | null>(null)
  const pos = useRef(STATIONS.doors.pos.clone())
  const tgt = useRef(STATIONS.doors.tgt.clone())
  const parallax = useRef({ x: 0, y: 0 })
  const tmp = useRef({
    p: new THREE.Vector3(),
    t: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
  })

  useFrame((state, dt) => {
    const nav = useNav.getState()
    const now = performance.now() / 1000
    const { p, t, fwd, right, lookAt } = tmp.current

    // Station change → author a flight (or snap under reduced motion)
    if (nav.station !== lastStation.current) {
      const to = STATIONS[nav.station]
      if (!nav.fullMotion) {
        pos.current.copy(to.pos)
        tgt.current.copy(to.tgt)
        flight.current = null
      } else {
        const spec = transitionFor(lastStation.current, nav.station)
        flight.current = {
          fromPos: pos.current.clone(),
          fromTgt: tgt.current.clone(),
          toPos: to.pos.clone(),
          toTgt: to.tgt.clone(),
          ctrlPos: shapeCtrl(spec.move, pos.current, to.pos),
          ctrlTgt: tgt.current.clone().add(to.tgt).multiplyScalar(0.5).lerp(ROOM_CENTRE, 0.12),
          startAt: now + spec.delay,
          dur: spec.dur,
        }
      }
      lastStation.current = nav.station
    }

    // Advance flight (delay lets the scene anticipate before the camera departs)
    if (flight.current) {
      const f = flight.current
      const kP = clamp01((now - f.startAt) / f.dur)
      const kT = clamp01((now - f.startAt + TARGET_LEAD) / f.dur)
      if (now >= f.startAt) {
        arcPoint(pos.current, f.fromPos, f.toPos, f.ctrlPos, overshootU(kP))
        arcPoint(tgt.current, f.fromTgt, f.toTgt, f.ctrlTgt, overshootU(kT))
      }
      if (kP >= 1 && kT >= 1) flight.current = null
    }

    p.copy(pos.current)
    t.copy(tgt.current)

    // Idle life — breathing dolly + mouse parallax (never during reduced motion)
    if (nav.fullMotion) {
      fwd.subVectors(t, p).normalize()
      right.crossVectors(fwd, camera.up).normalize()
      const breathe = flight.current ? 0 : Math.sin((now * Math.PI * 2) / 6.4) * 0.018
      const damp = 1 - Math.exp(-4.5 * dt)
      parallax.current.x += (state.pointer.x - parallax.current.x) * damp
      parallax.current.y += (state.pointer.y - parallax.current.y) * damp
      p.addScaledVector(fwd, breathe)
      p.addScaledVector(right, parallax.current.x * 0.085)
      p.y += parallax.current.y * 0.045
      t.addScaledVector(right, parallax.current.x * 0.02)
    }

    camera.position.copy(p)
    lookAt.copy(t)
    camera.lookAt(lookAt)

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__rig = {
        pos: pos.current.toArray(),
        tgt: tgt.current.toArray(),
        flying: !!flight.current,
        station: nav.station,
      }
    }
  })

  return null
}
