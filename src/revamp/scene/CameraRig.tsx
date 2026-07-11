import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { STATIONS, transitionFor, SAFE_FRACTION, type MoveKind, type StationId } from './stations'
import { easeCamera, clamp01 } from './easing'
import { useScene } from '../stores/scene'

/**
 * The preserved camera grammar (v1 CameraRig is the behavioral reference,
 * plan §12.1/§12.4): dolly-pan on quadratic bézier arcs, look-target leading
 * position by 80 ms, 2% overshoot settle, per-move control-point shaping,
 * always interruptible from the camera's current state, idle breathing +
 * damped mouse parallax, zero roll, FOV fixed in travel.
 */

const ROOM_CENTRE = new Vector3(0, 1.4, 2.2)
const TARGET_LEAD = 0.08
const OVERSHOOT = 0.028

const now = () => performance.now() / 1000

function vec(v: { x: number; y: number; z: number }) {
  return new Vector3(v.x, v.y, v.z)
}

/** quadratic bézier */
function arcPoint(out: Vector3, a: Vector3, ctrl: Vector3, b: Vector3, u: number) {
  const inv = 1 - u
  out.set(
    inv * inv * a.x + 2 * inv * u * ctrl.x + u * u * b.x,
    inv * inv * a.y + 2 * inv * u * ctrl.y + u * u * b.y,
    inv * inv * a.z + 2 * inv * u * ctrl.z + u * u * b.z,
  )
  return out
}

/** rises on the camera curve to 1 + OVERSHOOT at apex, eases back to exactly 1 */
function overshootU(k: number): number {
  const apex = 0.86
  if (k <= apex) return easeCamera(k / apex) * (1 + OVERSHOOT)
  const back = (k - apex) / (1 - apex)
  return 1 + OVERSHOOT * (1 - easeCamera(back))
}

/** per-move bézier control shaping — the move library's personality */
function shapeCtrl(move: MoveKind, from: Vector3, to: Vector3): Vector3 {
  const mid = from.clone().lerp(to, 0.5)
  switch (move) {
    case 'arc':
      mid.lerp(ROOM_CENTRE, 0.45)
      mid.y += 0.1
      mid.z += 0.35
      return mid
    case 'crane':
      mid.y = from.y * 0.35 + to.y * 0.65
      mid.lerp(ROOM_CENTRE, 0.15)
      return mid
    case 'pedestal':
      mid.y += 0.16
      mid.z += 0.22
      return mid
    case 'pull':
      return mid.lerp(ROOM_CENTRE, 0.08)
    default:
      return mid.lerp(ROOM_CENTRE, 0.3)
  }
}

interface Flight {
  fromPos: Vector3
  fromTgt: Vector3
  toPos: Vector3
  toTgt: Vector3
  ctrlPos: Vector3
  ctrlTgt: Vector3
  startAt: number
  dur: number
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  const pos = useRef(vec(STATIONS.overview.pos))
  const tgt = useRef(vec(STATIONS.overview.tgt))
  const flight = useRef<Flight | null>(null)
  const lastStation = useRef<StationId>('overview')
  const mouse = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const scratch = useRef(new Vector3())
  const fwd = useRef(new Vector3())

  // safe-area view offset: compose for the visible left region when the
  // workspace panel is open (viewMode 'split')
  useEffect(() => {
    const apply = () => {
      const mode = useScene.getState().viewMode
      if (mode === 'split') {
        camera.setViewOffset(size.width * SAFE_FRACTION, size.height, 0, 0, size.width, size.height)
      } else {
        camera.clearViewOffset()
      }
      camera.updateProjectionMatrix()
    }
    apply()
    return useScene.subscribe((s, prev) => {
      if (s.viewMode !== prev.viewMode) apply()
    })
  }, [camera, size.width, size.height])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, dt) => {
    const s = useScene.getState()
    const t = now()
    const station = STATIONS[s.station]

    // author a new flight from the CURRENT state — never queue, never snap
    if (s.station !== lastStation.current) {
      const spec = transitionFor(lastStation.current, s.station)
      lastStation.current = s.station
      if (!s.fullMotion) {
        flight.current = null
        pos.current.copy(vec(station.pos))
        tgt.current.copy(vec(station.tgt))
      } else {
        const toPos = vec(station.pos)
        const toTgt = vec(station.tgt)
        flight.current = {
          fromPos: pos.current.clone(),
          fromTgt: tgt.current.clone(),
          toPos,
          toTgt,
          ctrlPos: shapeCtrl(spec.move, pos.current, toPos),
          ctrlTgt: tgt.current.clone().lerp(toTgt, 0.5).lerp(ROOM_CENTRE, 0.12),
          startAt: t + spec.delay,
          dur: spec.dur,
        }
      }
    }

    const f = flight.current
    if (f) {
      const kP = clamp01((t - f.startAt) / f.dur)
      const kT = clamp01((t - f.startAt + TARGET_LEAD) / f.dur)
      if (t >= f.startAt) {
        arcPoint(pos.current, f.fromPos, f.ctrlPos, f.toPos, overshootU(kP))
        arcPoint(tgt.current, f.fromTgt, f.ctrlTgt, f.toTgt, overshootU(kT))
      }
      if (kP >= 1 && kT >= 1) {
        pos.current.copy(f.toPos)
        tgt.current.copy(f.toTgt)
        flight.current = null
      }
    }

    // idle life: breathing dolly + damped parallax — suppressed in flight,
    // disabled under reduced motion
    const camPos = scratch.current.copy(pos.current)
    if (!f && s.fullMotion) {
      fwd.current.copy(tgt.current).sub(pos.current).normalize()
      const breathe = Math.sin((t * Math.PI * 2) / 6.4) * 0.018
      camPos.addScaledVector(fwd.current, breathe)
      const damp = 1 - Math.exp(-4.5 * dt)
      mouse.current.px += (mouse.current.x - mouse.current.px) * damp
      mouse.current.py += (mouse.current.y - mouse.current.py) * damp
      camPos.x += mouse.current.px * 0.085
      camPos.y += -mouse.current.py * 0.045
    }

    camera.position.copy(camPos)
    camera.up.set(0, 1, 0) // zero roll, always
    camera.lookAt(
      tgt.current.x + (f || !s.fullMotion ? 0 : mouse.current.px * 0.02),
      tgt.current.y,
      tgt.current.z,
    )
  })

  // dev probe for preview tooling and e2e (v1's window.__rig pattern)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const probe = {
      get pos() {
        return { x: pos.current.x, y: pos.current.y, z: pos.current.z }
      },
      get tgt() {
        return { x: tgt.current.x, y: tgt.current.y, z: tgt.current.z }
      },
      get flying() {
        return flight.current !== null
      },
      get station() {
        return useScene.getState().station
      },
    }
    ;(window as unknown as Record<string, unknown>).__rig = probe
  }, [])

  return null
}
