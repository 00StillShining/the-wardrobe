import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { CAB, MODULE_X } from './dims'
import { useGreyboxMaterials } from './materials'
import { useScene } from '../../stores/scene'
import { easeCamera, settle, clamp01 } from '../easing'

const now = () => performance.now() / 1000

/** drawer body sits mostly inside the carcase when closed */
const DRAWER_CLOSED_Z = CAB.d - 0.35

/**
 * Grey-box cabinet: one designed object per cabinet-plan.md. Doors, drawer and
 * the camera-departure handoff are driven from wall-clock state in the scene
 * store, so behavior is identical under the demand frameloop.
 */
export function Cabinet() {
  const m = useGreyboxMaterials()
  const leftDoor = useRef<Group>(null)
  const rightDoor = useRef<Group>(null)
  const drawer = useRef<Mesh>(null)
  const departed = useRef(false)

  useFrame(() => {
    const s = useScene.getState()
    const t = now()

    // —— doors ——
    let openK = 0
    if (s.doorPhase !== 'closed') {
      if (s.fullMotion) {
        const kR = clamp01((t - s.tDoors) / CAB.doorDur)
        const kL = clamp01((t - s.tDoors - CAB.doorLag) / CAB.doorDur)
        if (rightDoor.current) rightDoor.current.rotation.y = settle(kR, 0.03) * CAB.doorOpenRad
        if (leftDoor.current) leftDoor.current.rotation.y = -settle(kL, 0.03) * CAB.doorOpenRad
        openK = kR
      } else {
        if (rightDoor.current) rightDoor.current.rotation.y = CAB.doorOpenRad
        if (leftDoor.current) leftDoor.current.rotation.y = -CAB.doorOpenRad
        openK = 1
      }
    } else {
      if (rightDoor.current) rightDoor.current.rotation.y = 0
      if (leftDoor.current) leftDoor.current.rotation.y = 0
      departed.current = false
    }

    // camera departs 250 ms after the doors start (anticipation beat)
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

    // —— ledger drawer —— (offset from its closed resting z)
    if (drawer.current) {
      const k = clamp01((t - s.tStation) / CAB.drawerDur)
      const offset = s.drawerOpen
        ? settle(k, 0.045) * CAB.drawerTravel
        : (1 - easeCamera(k)) * CAB.drawerTravel
      const rest = s.drawerOpen ? CAB.drawerTravel : 0
      drawer.current.position.z =
        DRAWER_CLOSED_Z + (s.fullMotion ? (k >= 1 ? rest : offset) : rest)
    }

    void openK
  })

  const yMid = CAB.plinthH + (CAB.h - CAB.plinthH) / 2
  const interiorD = CAB.d - CAB.panel * 2
  const doorH = CAB.h - CAB.plinthH - CAB.frame * 2 - CAB.drawerH
  const doorY = CAB.plinthH + CAB.drawerH + CAB.frame + doorH / 2
  const frontZ = CAB.d

  return (
    <group>
      {/* plinth */}
      <mesh material={m.ebonizedDeep} position={[0, CAB.plinthH / 2, CAB.d / 2]} castShadow receiveShadow>
        <boxGeometry args={[CAB.w + 0.04, CAB.plinthH, CAB.d + 0.02]} />
      </mesh>

      {/* carcase: back, top, flanks */}
      <mesh material={m.interior} position={[0, yMid, CAB.panel / 2]} receiveShadow>
        <boxGeometry args={[CAB.w - CAB.frame, CAB.h - CAB.plinthH - CAB.frame, CAB.panel]} />
      </mesh>
      <mesh material={m.ebonized} position={[0, CAB.h - CAB.frame / 2, CAB.d / 2]} castShadow>
        <boxGeometry args={[CAB.w, CAB.frame, CAB.d]} />
      </mesh>
      <mesh material={m.ebonized} position={[-CAB.w / 2 + CAB.frame / 2, yMid, CAB.d / 2]} castShadow>
        <boxGeometry args={[CAB.frame, CAB.h - CAB.plinthH, CAB.d]} />
      </mesh>
      <mesh material={m.ebonized} position={[CAB.w / 2 - CAB.frame / 2, yMid, CAB.d / 2]} castShadow>
        <boxGeometry args={[CAB.frame, CAB.h - CAB.plinthH, CAB.d]} />
      </mesh>

      {/* module dividers */}
      {[MODULE_X.abDivider, MODULE_X.bcDivider].map((x) => (
        <mesh key={x} material={m.oakDeep} position={[x, yMid + CAB.drawerH / 2, CAB.d / 2]} castShadow>
          <boxGeometry args={[CAB.panel, CAB.h - CAB.plinthH - CAB.drawerH - CAB.frame, interiorD]} />
        </mesh>
      ))}

      {/* module A: hanging bay — brass rail */}
      <mesh
        material={m.brass}
        position={[MODULE_X.aCenter, CAB.railY, CAB.d / 2]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.011, 0.011, CAB.moduleA - CAB.frame * 2, 12]} />
      </mesh>

      {/* module B: open shelf column */}
      {CAB.shelfYs.map((y) => (
        <mesh key={y} material={m.oak} position={[MODULE_X.bCenter, y, CAB.d / 2]} castShadow receiveShadow>
          <boxGeometry args={[CAB.moduleB - CAB.panel, 0.022, interiorD - 0.03]} />
        </mesh>
      ))}

      {/* module C: archive rail */}
      <mesh
        material={m.brass}
        position={[MODULE_X.cCenter, CAB.railY, CAB.d / 2]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.011, 0.011, CAB.moduleC - CAB.frame * 2, 12]} />
      </mesh>

      {/* ledger drawer (module A+B width) */}
      <mesh
        ref={drawer}
        material={m.oak}
        position={[(MODULE_X.aLeft + MODULE_X.bcDivider) / 2 + CAB.frame / 2, CAB.drawerY + CAB.drawerH / 2, DRAWER_CLOSED_Z]}
        castShadow
      >
        <boxGeometry args={[CAB.moduleA + CAB.moduleB - CAB.frame * 2, CAB.drawerH - 0.02, 0.5]} />
      </mesh>

      {/* left door (module A) — interior mirror; hinge on outer stile */}
      <group ref={leftDoor} position={[MODULE_X.aLeft + 0.01, doorY, frontZ - CAB.panel / 2]}>
        <mesh material={m.ebonized} position={[CAB.moduleA / 2, 0, 0]} castShadow>
          <boxGeometry args={[CAB.moduleA - 0.012, doorH, CAB.panel]} />
        </mesh>
        <mesh material={m.mirror} position={[CAB.moduleA / 2, 0.05, -CAB.panel / 2 - 0.003]}>
          <boxGeometry args={[CAB.moduleA - 0.16, doorH - 0.3, 0.004]} />
        </mesh>
        <mesh material={m.brass} position={[CAB.moduleA - 0.05, 0, CAB.panel / 2 + 0.015]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 10]} />
        </mesh>
      </group>

      {/* right door (module C) — interior linen pinboard */}
      <group ref={rightDoor} position={[MODULE_X.cRight - 0.01, doorY, frontZ - CAB.panel / 2]}>
        <mesh material={m.ebonized} position={[-CAB.moduleC / 2, 0, 0]} castShadow>
          <boxGeometry args={[CAB.moduleC - 0.012, doorH, CAB.panel]} />
        </mesh>
        <mesh material={m.linen} position={[-CAB.moduleC / 2, 0.05, -CAB.panel / 2 - 0.003]}>
          <boxGeometry args={[CAB.moduleC - 0.14, doorH - 0.3, 0.004]} />
        </mesh>
        <mesh material={m.brass} position={[-CAB.moduleC + 0.05, 0, CAB.panel / 2 + 0.015]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.24, 10]} />
        </mesh>
      </group>

      {/* module B front: open — thin oak fascia above and below */}
      <mesh material={m.oakDeep} position={[MODULE_X.bCenter, CAB.h - CAB.frame - 0.05, frontZ - 0.02]}>
        <boxGeometry args={[CAB.moduleB, 0.1, 0.02]} />
      </mesh>

      {/* post tray return on the LEFT flank — keeps the right visual field
          clean for the overview hero panel */}
      <group position={[-(CAB.w / 2 + CAB.trayW / 2), CAB.trayY, CAB.d / 2]}>
        <mesh material={m.oak} castShadow receiveShadow>
          <boxGeometry args={[CAB.trayW, 0.03, CAB.trayD]} />
        </mesh>
        <mesh material={m.brass} position={[0, 0.035, 0]} castShadow>
          <boxGeometry args={[CAB.trayW - 0.1, 0.04, CAB.trayD - 0.1]} />
        </mesh>
      </group>
    </group>
  )
}
