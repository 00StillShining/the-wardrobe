import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Group } from 'three'
import { CAB, MODULE_X } from './dims'
import {
  useBottleFelt,
  useBrass,
  useEbonized,
  useLinenWeave,
  useMirrorGlass,
  usePaleOak,
} from './realMaterials'
import { useScene } from '../../stores/scene'
import { easeCamera, settle, clamp01 } from '../easing'

const now = () => performance.now() / 1000

/** drawer body sits mostly inside the carcase when closed */
const DRAWER_CLOSED_Z = CAB.d - 0.35

/**
 * The crafted cabinet (plan §12.2 step 2): same modules, pivots and
 * choreography as the grey-box it replaces — the camera contract is
 * untouched — with real construction: stile-and-rail doors, beveled
 * ebonized frame, pale-oak interior with per-panel grain, aged brass
 * hardware, felt-lined ledger drawer, housed bay lights.
 */
export function Cabinet() {
  const oakV = usePaleOak({ rotation: 0, repeat: [1, 2] })
  const oakH = usePaleOak({ rotation: Math.PI / 2, repeat: [2, 1] })
  const ebonV = useEbonized({ rotation: 0, repeat: [1, 2] })
  const ebonH = useEbonized({ rotation: Math.PI / 2, repeat: [2, 1] })
  const brass = useBrass()
  const linen = useLinenWeave()
  const mirror = useMirrorGlass()
  const felt = useBottleFelt()

  const leftDoor = useRef<Group>(null)
  const rightDoor = useRef<Group>(null)
  const drawer = useRef<Group>(null)
  const departed = useRef(false)

  useFrame(() => {
    const s = useScene.getState()
    const t = now()

    if (s.doorPhase !== 'closed') {
      if (s.fullMotion) {
        const kR = clamp01((t - s.tDoors) / CAB.doorDur)
        const kL = clamp01((t - s.tDoors - CAB.doorLag) / CAB.doorDur)
        if (rightDoor.current) rightDoor.current.rotation.y = settle(kR, 0.03) * CAB.doorOpenRad
        if (leftDoor.current) leftDoor.current.rotation.y = -settle(kL, 0.03) * CAB.doorOpenRad
      } else {
        if (rightDoor.current) rightDoor.current.rotation.y = CAB.doorOpenRad
        if (leftDoor.current) leftDoor.current.rotation.y = -CAB.doorOpenRad
      }
    } else {
      if (rightDoor.current) rightDoor.current.rotation.y = 0
      if (leftDoor.current) leftDoor.current.rotation.y = 0
      departed.current = false
    }

    if (
      s.doorPhase === 'opening' &&
      s.pendingStation &&
      !departed.current &&
      t - s.tDoors >= CAB.cameraDepartDelay
    ) {
      departed.current = true
      s._arrive(s.pendingStation)
    }
    if (s.doorPhase === 'open') departed.current = false

    if (drawer.current) {
      const k = clamp01((t - s.tStation) / CAB.drawerDur)
      const offset = s.drawerOpen
        ? settle(k, 0.045) * CAB.drawerTravel
        : (1 - easeCamera(k)) * CAB.drawerTravel
      const rest = s.drawerOpen ? CAB.drawerTravel : 0
      drawer.current.position.z = DRAWER_CLOSED_Z + (s.fullMotion ? (k >= 1 ? rest : offset) : rest)
    }
  })

  const yMid = CAB.plinthH + (CAB.h - CAB.plinthH) / 2
  const interiorD = CAB.d - CAB.panel * 2
  const doorH = CAB.h - CAB.plinthH - CAB.frame * 2 - CAB.drawerH
  const doorY = CAB.plinthH + CAB.drawerH + CAB.frame + doorH / 2
  const frontZ = CAB.d
  const stile = 0.075
  const railH = 0.09

  /** stile-and-rail door with a recessed panel and an interior surface */
  function Door({
    width,
    hinge,
    interior,
  }: {
    width: number
    hinge: 'left' | 'right'
    interior: 'mirror' | 'pinboard'
  }) {
    const dir = hinge === 'left' ? 1 : -1
    const cx = (width / 2) * dir
    return (
      <>
        {/* stiles */}
        <RoundedBox args={[stile, doorH, CAB.panel]} radius={0.004} smoothness={2} material={ebonV} position={[stile / 2 * dir, 0, 0]} castShadow />
        <RoundedBox args={[stile, doorH, CAB.panel]} radius={0.004} smoothness={2} material={ebonV} position={[(width - stile / 2) * dir, 0, 0]} castShadow />
        {/* rails */}
        {[doorH / 2 - railH / 2, 0, -doorH / 2 + railH / 2].map((y) => (
          <RoundedBox key={y} args={[width - stile * 2, railH, CAB.panel]} radius={0.004} smoothness={2} material={ebonH} position={[cx, y, 0]} castShadow />
        ))}
        {/* recessed front panels — centred in their openings so no light leaks */}
        {[doorH / 4 - railH / 4, -(doorH / 4 - railH / 4)].map((y) => (
          <mesh key={y} material={ebonV} position={[cx, y, -CAB.panel * 0.22]}>
            <boxGeometry args={[width - stile * 2 + 0.01, doorH / 2 - railH * 1.5 + 0.012, CAB.panel * 0.5]} />
          </mesh>
        ))}
        {/* interior working surface */}
        <mesh material={interior === 'mirror' ? mirror : linen} position={[cx, 0.05, -CAB.panel / 2 - 0.004]}>
          <boxGeometry args={[width - stile * 2 - 0.02, doorH - railH * 2 - 0.08, 0.006]} />
        </mesh>
        {/* brass frame bead around the interior surface */}
        <mesh material={brass} position={[cx, 0.05 + (doorH - railH * 2 - 0.08) / 2 + 0.008, -CAB.panel / 2 - 0.004]}>
          <boxGeometry args={[width - stile * 2 - 0.02, 0.012, 0.008]} />
        </mesh>
        <mesh material={brass} position={[cx, 0.05 - (doorH - railH * 2 - 0.08) / 2 - 0.008, -CAB.panel / 2 - 0.004]}>
          <boxGeometry args={[width - stile * 2 - 0.02, 0.012, 0.008]} />
        </mesh>
        {/* pull */}
        <mesh material={brass} position={[(width - stile / 2) * dir - 0.02 * dir, 0, CAB.panel / 2 + 0.018]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.26, 12]} />
        </mesh>
        {/* hinge knuckles */}
        {[doorH / 2 - 0.18, 0, -doorH / 2 + 0.18].map((y) => (
          <mesh key={y} material={brass} position={[0.006 * dir, y, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.07, 10]} />
          </mesh>
        ))}
      </>
    )
  }

  /** housed light bar at the top of a bay — a fixture, not a floating strip */
  function BayLight({ x, width }: { x: number; width: number }) {
    return (
      <group position={[x, CAB.h - CAB.frame - 0.045, CAB.d / 2 + 0.14]}>
        <mesh material={ebonH} castShadow>
          <boxGeometry args={[width, 0.03, 0.05]} />
        </mesh>
        <mesh position={[0, -0.017, 0]}>
          <boxGeometry args={[width - 0.04, 0.006, 0.03]} />
          <meshStandardMaterial color="#e8c890" emissive="#ffb75e" emissiveIntensity={0.9} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* plinth — chamfered ebonized base */}
      <RoundedBox args={[CAB.w + 0.05, CAB.plinthH, CAB.d + 0.03]} radius={0.012} smoothness={2} material={ebonH} position={[0, CAB.plinthH / 2, CAB.d / 2]} castShadow receiveShadow />

      {/* interior back — oak, vertical grain */}
      <mesh material={oakV} position={[0, yMid, CAB.panel / 2]} receiveShadow>
        <boxGeometry args={[CAB.w - CAB.frame, CAB.h - CAB.plinthH - CAB.frame, CAB.panel]} />
      </mesh>

      {/* frame: top + flanks, beveled ebonized */}
      <RoundedBox args={[CAB.w, CAB.frame, CAB.d]} radius={0.006} smoothness={2} material={ebonH} position={[0, CAB.h - CAB.frame / 2, CAB.d / 2]} castShadow />
      <RoundedBox args={[CAB.frame, CAB.h - CAB.plinthH, CAB.d]} radius={0.006} smoothness={2} material={ebonV} position={[-CAB.w / 2 + CAB.frame / 2, yMid, CAB.d / 2]} castShadow />
      <RoundedBox args={[CAB.frame, CAB.h - CAB.plinthH, CAB.d]} radius={0.006} smoothness={2} material={ebonV} position={[CAB.w / 2 - CAB.frame / 2, yMid, CAB.d / 2]} castShadow />

      {/* module dividers — oak */}
      {[MODULE_X.abDivider, MODULE_X.bcDivider].map((x) => (
        <mesh key={x} material={oakV} position={[x, yMid + CAB.drawerH / 2, CAB.d / 2]} castShadow>
          <boxGeometry args={[CAB.panel, CAB.h - CAB.plinthH - CAB.drawerH - CAB.frame, interiorD]} />
        </mesh>
      ))}

      {/* rails with end brackets */}
      {[
        { x: MODULE_X.aCenter, w: CAB.moduleA - CAB.frame * 2 },
        { x: MODULE_X.cCenter, w: CAB.moduleC - CAB.frame * 2 },
      ].map(({ x, w }) => (
        <group key={x} position={[x, CAB.railY, CAB.d / 2]}>
          <mesh material={brass} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.011, 0.011, w, 16]} />
          </mesh>
          {[-w / 2, w / 2].map((bx) => (
            <mesh key={bx} material={brass} position={[bx, 0.02, 0]}>
              <boxGeometry args={[0.016, 0.055, 0.016]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* shelf column — oak shelves, rounded front edge, brass pins */}
      {CAB.shelfYs.map((y) => (
        <group key={y}>
          <RoundedBox args={[CAB.moduleB - CAB.panel, 0.026, interiorD - 0.03]} radius={0.006} smoothness={2} material={oakH} position={[MODULE_X.bCenter, y, CAB.d / 2]} castShadow receiveShadow />
          {[MODULE_X.abDivider + 0.02, MODULE_X.bcDivider - 0.02].map((px) => (
            <mesh key={px} material={brass} position={[px, y - 0.02, CAB.d / 2 + interiorD / 2 - 0.05]}>
              <cylinderGeometry args={[0.005, 0.005, 0.012, 8]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* bay lights, housed */}
      <BayLight x={MODULE_X.aCenter} width={CAB.moduleA - CAB.frame * 2} />
      <BayLight x={MODULE_X.bCenter} width={CAB.moduleB - CAB.panel} />
      <BayLight x={MODULE_X.cCenter} width={CAB.moduleC - CAB.frame * 2} />

      {/* ledger drawer — felt-lined oak box, framed front, recessed pull */}
      <group ref={drawer} position={[(MODULE_X.aLeft + MODULE_X.bcDivider) / 2 + CAB.frame / 2, CAB.drawerY + CAB.drawerH / 2, DRAWER_CLOSED_Z]}>
        <mesh material={oakH} castShadow>
          <boxGeometry args={[CAB.moduleA + CAB.moduleB - CAB.frame * 2, CAB.drawerH - 0.02, 0.5]} />
        </mesh>
        <mesh material={felt} position={[0, 0.012, 0]}>
          <boxGeometry args={[CAB.moduleA + CAB.moduleB - CAB.frame * 2 - 0.03, CAB.drawerH - 0.02, 0.47]} />
        </mesh>
        <RoundedBox args={[CAB.moduleA + CAB.moduleB - CAB.frame * 2, CAB.drawerH - 0.012, 0.02]} radius={0.005} smoothness={2} material={ebonH} position={[0, 0, 0.26]} castShadow />
        <mesh material={brass} position={[0, 0, 0.275]}>
          <boxGeometry args={[0.16, 0.018, 0.012]} />
        </mesh>
      </group>

      {/* left door (module A) — interior mirror */}
      <group ref={leftDoor} position={[MODULE_X.aLeft + 0.01, doorY, frontZ - CAB.panel / 2]}>
        <Door width={CAB.moduleA - 0.012} hinge="left" interior="mirror" />
      </group>

      {/* right door (module C) — interior linen pinboard */}
      <group ref={rightDoor} position={[MODULE_X.cRight - 0.01, doorY, frontZ - CAB.panel / 2]}>
        <Door width={CAB.moduleC - 0.012} hinge="right" interior="pinboard" />
      </group>

      {/* module B fascia */}
      <RoundedBox args={[CAB.moduleB, 0.1, 0.024]} radius={0.005} smoothness={2} material={oakH} position={[MODULE_X.bCenter, CAB.h - CAB.frame - 0.05, frontZ - 0.02]} castShadow />

      {/* post tray return on the left flank — oak shelf, brass tray with rim */}
      <group position={[-(CAB.w / 2 + CAB.trayW / 2), CAB.trayY, CAB.d / 2]}>
        <RoundedBox args={[CAB.trayW, 0.03, CAB.trayD]} radius={0.006} smoothness={2} material={oakH} castShadow receiveShadow />
        <mesh material={ebonV} position={[CAB.trayW / 2 - 0.02, -0.09, -CAB.trayD / 2 + 0.05]} castShadow>
          <boxGeometry args={[0.026, 0.15, 0.026]} />
        </mesh>
        <group position={[0, 0.035, 0]}>
          <mesh material={brass}>
            <boxGeometry args={[CAB.trayW - 0.1, 0.008, CAB.trayD - 0.1]} />
          </mesh>
          {[
            [0, (CAB.trayD - 0.1) / 2],
            [0, -(CAB.trayD - 0.1) / 2],
          ].map(([x, z], i) => (
            <mesh key={i} material={brass} position={[x, 0.014, z]}>
              <boxGeometry args={[CAB.trayW - 0.1, 0.022, 0.008]} />
            </mesh>
          ))}
          {[
            [(CAB.trayW - 0.1) / 2, 0],
            [-(CAB.trayW - 0.1) / 2, 0],
          ].map(([x, z], i) => (
            <mesh key={i} material={brass} position={[x, 0.014, z]}>
              <boxGeometry args={[0.008, 0.022, CAB.trayD - 0.1]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
