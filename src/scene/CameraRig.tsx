import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useNav, type StationId } from '../state/navigation'
import { easeCamera, clamp01 } from './easing'

/**
 * Manual camera rig implementing the house move grammar:
 * dolly-pan along a quadratic bézier arc (control point pulled toward
 * the room centre), target leading the camera by 80ms, 2% settle
 * overshoot, then idle life (breathing dolly + mouse parallax).
 */

interface Framing {
  pos: THREE.Vector3
  tgt: THREE.Vector3
}

const STATIONS: Record<StationId, Framing> = {
  doors: {
    pos: new THREE.Vector3(0.42, 1.45, 4.95),
    tgt: new THREE.Vector3(0, 1.21, 0),
  },
  rail: {
    pos: new THREE.Vector3(0.02, 1.34, 2.75),
    tgt: new THREE.Vector3(0, 1.18, -0.2),
  },
}

const FLIGHT_DUR: Partial<Record<`${StationId}->${StationId}`, number>> = {
  'doors->rail': 1.35,
  'rail->doors': 1.2,
}

const ROOM_CENTRE = new THREE.Vector3(0, 1.5, 2.4)
const TARGET_LEAD = 0.08 // seconds the pan leads the dolly
const OVERSHOOT = 0.02

function arcPoint(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, ctrl: THREE.Vector3, u: number) {
  // quadratic bézier, allowed to run slightly past u=1 for the settle
  const v = 1 - u
  out.set(
    v * v * a.x + 2 * v * u * ctrl.x + u * u * b.x,
    v * v * a.y + 2 * v * u * ctrl.y + u * u * b.y,
    v * v * a.z + 2 * v * u * ctrl.z + u * u * b.z,
  )
  return out
}

/** progress → path parameter with a 2% overshoot that settles back */
function overshootU(k: number): number {
  if (k >= 1) return 1
  const apex = 0.86
  if (k < apex) return easeCamera(k / apex) * (1 + OVERSHOOT)
  return 1 + OVERSHOOT * (1 - easeCamera((k - apex) / (1 - apex)))
}

interface Flight {
  fromPos: THREE.Vector3
  fromTgt: THREE.Vector3
  toPos: THREE.Vector3
  toTgt: THREE.Vector3
  ctrlPos: THREE.Vector3
  ctrlTgt: THREE.Vector3
  t0: number
  dur: number
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const lastStation = useRef<StationId>('doors')
  const flight = useRef<Flight | null>(null)
  const pos = useRef(STATIONS.doors.pos.clone())
  const tgt = useRef(STATIONS.doors.tgt.clone())
  const pointer = useRef({ x: 0, y: 0 })
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

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__rig = {
        pos: pos.current.toArray(),
        tgt: tgt.current.toArray(),
        flight: flight.current ? { t0: flight.current.t0, dur: flight.current.dur, now } : null,
        station: nav.station,
        last: lastStation.current,
      }
    }

    pointer.current.x = state.pointer.x
    pointer.current.y = state.pointer.y

    // Station change → start (or retarget) a flight
    if (nav.station !== lastStation.current) {
      const to = STATIONS[nav.station]
      if (!nav.fullMotion) {
        pos.current.copy(to.pos)
        tgt.current.copy(to.tgt)
        flight.current = null
      } else {
        const key = `${lastStation.current}->${nav.station}` as const
        const dur = FLIGHT_DUR[key] ?? 1.1
        const fromPos = pos.current.clone()
        const fromTgt = tgt.current.clone()
        const ctrlPos = fromPos.clone().add(to.pos).multiplyScalar(0.5).lerp(ROOM_CENTRE, 0.3)
        ctrlPos.y += 0.12
        const ctrlTgt = fromTgt.clone().add(to.tgt).multiplyScalar(0.5).lerp(ROOM_CENTRE, 0.12)
        flight.current = {
          fromPos,
          fromTgt,
          toPos: to.pos.clone(),
          toTgt: to.tgt.clone(),
          ctrlPos,
          ctrlTgt,
          t0: now,
          dur,
        }
      }
      lastStation.current = nav.station
    }

    // Advance flight
    if (flight.current) {
      const f = flight.current
      const kP = clamp01((now - f.t0) / f.dur)
      const kT = clamp01((now - f.t0 + TARGET_LEAD) / f.dur)
      arcPoint(pos.current, f.fromPos, f.toPos, f.ctrlPos, overshootU(kP))
      arcPoint(tgt.current, f.fromTgt, f.toTgt, f.ctrlTgt, overshootU(kT))
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
      parallax.current.x += (pointer.current.x - parallax.current.x) * damp
      parallax.current.y += (pointer.current.y - parallax.current.y) * damp
      p.addScaledVector(fwd, breathe)
      p.addScaledVector(right, parallax.current.x * 0.085)
      p.y += parallax.current.y * 0.045
      t.addScaledVector(right, parallax.current.x * 0.02)
    }

    camera.position.copy(p)
    lookAt.copy(t)
    camera.lookAt(lookAt)
  })

  return null
}
