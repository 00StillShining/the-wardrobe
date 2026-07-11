import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, PointLight } from 'three'
import { LAN, MOD } from './dims'
import { useLanternMaterials } from './materials'
import { useScene } from '../../stores/scene'
import { easeCamera, settle, clamp01 } from '../easing'

const now = () => performance.now() / 1000
const CASE_BOTTOM = LAN.baseH + LAN.floatGap
const FRONT_Z = LAN.d

/**
 * The Lantern (scene-v2-lantern.md): thin dark case, brass edge lines,
 * translucent linen double doors, open garment bay, golden cane slide,
 * base drawer. Interior glow ramps as the doors part; every animation is
 * wall-clock driven and dead under reduced motion.
 */
export function Lantern() {
  const m = useLanternMaterials()
  const leftLeaf = useRef<Group>(null)
  const rightLeaf = useRef<Group>(null)
  const cane = useRef<Group>(null)
  const drawer = useRef<Group>(null)
  const glowA = useRef<PointLight>(null)
  const glowB = useRef<PointLight>(null)
  const departed = useRef(false)

  useFrame(() => {
    const s = useScene.getState()
    const t = now()

    // —— sliding panels + glow choreography (reference-true; nothing
    // ever swings into the room, so no framing can be blocked) ——
    if (s.doorPhase !== 'closed') {
      if (s.fullMotion) {
        const kR = clamp01((t - s.tDoors) / LAN.doorDur)
        if (rightLeaf.current) {
          rightLeaf.current.position.x = MOD.aRight - 0.01 - settle(kR, 0.02) * LAN.doorSlide
          // the moving leaf rides just proud of the static one
          rightLeaf.current.position.z = FRONT_Z - 0.02 + easeCamera(clamp01(kR * 3)) * 0.02
        }
      } else if (rightLeaf.current) {
        rightLeaf.current.position.x = MOD.aRight - 0.01 - LAN.doorSlide
        rightLeaf.current.position.z = FRONT_Z
      }
    } else {
      if (rightLeaf.current) {
        rightLeaf.current.position.x = MOD.aRight - 0.01
        rightLeaf.current.position.z = FRONT_Z - 0.02
      }
      departed.current = false
    }

    if (
      s.doorPhase === 'opening' &&
      s.pendingStation &&
      !departed.current &&
      t - s.tDoors >= LAN.cameraDepartDelay
    ) {
      departed.current = true
      s._arrive(s.pendingStation)
    }
    if (s.doorPhase === 'open') departed.current = false

    // cane panel slides for Style Studio (and on the entry set piece)
    if (cane.current) {
      const wantOpen = s.caneOpen || (s.doorPhase !== 'closed' && s.station === 'style')
      const k = clamp01((t - Math.max(s.tStation, s.tDoors) - LAN.caneLag) / LAN.caneDur)
      const target = wantOpen ? settle(k, 0.03) * LAN.caneSlide : (1 - easeCamera(k)) * LAN.caneSlide
      cane.current.position.x = s.fullMotion ? (k >= 1 ? (wantOpen ? LAN.caneSlide : 0) : target) : wantOpen ? LAN.caneSlide : 0
      cane.current.position.z = s.fullMotion ? easeCamera(clamp01(k * 3)) * (wantOpen ? 0.018 : 0) : 0
    }

    // drawer glides for Insights
    if (drawer.current) {
      const k = clamp01((t - s.tStation) / LAN.drawerDur)
      const offset = s.drawerOpen ? settle(k, 0.055) * LAN.drawerTravel : (1 - easeCamera(k)) * LAN.drawerTravel
      const rest = s.drawerOpen ? LAN.drawerTravel : 0
      drawer.current.position.z = s.fullMotion ? (k >= 1 ? rest : offset) : rest
    }

    // interior glow: baseline lantern glow, blooming with the entry
    const glowK = s.doorPhase === 'closed' ? 0.7 : 0.7 + 0.3 * settle(clamp01((t - s.tDoors) / LAN.glowRamp), 0.12)
    const breathe = s.fullMotion ? 1 + Math.sin((t * Math.PI * 2) / 9) * 0.02 : 1
    if (glowA.current) glowA.current.intensity = 1.3 * glowK * breathe
    if (glowB.current) glowB.current.intensity = 1.7 * glowK * breathe
  })

  const innerH = LAN.h - LAN.shell * 2
  const yMid = CASE_BOTTOM + LAN.h / 2
  const leafW = LAN.aW / 2 - 0.008

  /** one hinged leaf: slim brass frame + translucent linen + pull plate */
  function Leaf({ hinge }: { hinge: 'left' | 'right' }) {
    const dir = hinge === 'left' ? 1 : -1
    const fr = 0.028 // frame member width
    const cx = (leafW / 2) * dir
    const panelH = innerH - 0.05
    return (
      <>
        {/* brass frame */}
        <mesh material={m.brass} position={[fr / 2 * dir, 0, 0]}>
          <boxGeometry args={[fr, panelH, 0.02]} />
        </mesh>
        <mesh material={m.brass} position={[(leafW - fr / 2) * dir, 0, 0]}>
          <boxGeometry args={[fr, panelH, 0.02]} />
        </mesh>
        <mesh material={m.brass} position={[cx, panelH / 2 - fr / 2, 0]}>
          <boxGeometry args={[leafW - fr * 2, fr, 0.02]} />
        </mesh>
        <mesh material={m.brass} position={[cx, -panelH / 2 + fr / 2, 0]}>
          <boxGeometry args={[leafW - fr * 2, fr, 0.02]} />
        </mesh>
        {/* the glowing linen field */}
        <mesh material={m.linenPanel} position={[cx, 0, 0]}>
          <boxGeometry args={[leafW - fr * 2, panelH - fr * 2, 0.012]} />
        </mesh>
        {/* pull plate at the meeting stile */}
        <mesh material={m.pull} position={[(leafW - fr) * dir, -0.05, 0.02]}>
          <boxGeometry args={[0.05, 0.22, 0.012]} />
        </mesh>
      </>
    )
  }

  return (
    <group>
      {/* recessed dark base + shadow gap — the case floats */}
      <mesh material={m.case} position={[0, LAN.baseH / 2, LAN.d / 2 - 0.04]}>
        <boxGeometry args={[LAN.w - 0.16, LAN.baseH, LAN.d - 0.08]} />
      </mesh>

      {/* case shell: top, sides, back */}
      <mesh material={m.case} position={[0, CASE_BOTTOM + LAN.h - LAN.shell / 2, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.w, LAN.shell, LAN.d]} />
      </mesh>
      <mesh material={m.case} position={[0, CASE_BOTTOM + LAN.shell / 2, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.w, LAN.shell, LAN.d]} />
      </mesh>
      <mesh material={m.case} position={[-LAN.w / 2 + LAN.shell / 2, yMid, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.shell, LAN.h, LAN.d]} />
      </mesh>
      <mesh material={m.case} position={[LAN.w / 2 - LAN.shell / 2, yMid, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.shell, LAN.h, LAN.d]} />
      </mesh>
      {/* linen-lined interior back */}
      <mesh material={m.wallLinen} position={[0, yMid, 0.015]}>
        <boxGeometry args={[LAN.w - LAN.shell * 2, innerH, 0.02]} />
      </mesh>

      {/* brass edge lines on the front perimeter */}
      {[
        { pos: [0, CASE_BOTTOM + LAN.h - LAN.shell / 2, FRONT_Z - 0.005] as const, size: [LAN.w, LAN.brassEdge, 0.01] as const },
        { pos: [0, CASE_BOTTOM + LAN.shell / 2, FRONT_Z - 0.005] as const, size: [LAN.w, LAN.brassEdge, 0.01] as const },
        { pos: [-LAN.w / 2 + LAN.shell / 2, yMid, FRONT_Z - 0.005] as const, size: [LAN.brassEdge, LAN.h, 0.01] as const },
        { pos: [LAN.w / 2 - LAN.shell / 2, yMid, FRONT_Z - 0.005] as const, size: [LAN.brassEdge, LAN.h, 0.01] as const },
      ].map((edge, i) => (
        <mesh key={i} material={m.brass} position={edge.pos as unknown as [number, number, number]}>
          <boxGeometry args={edge.size as unknown as [number, number, number]} />
        </mesh>
      ))}

      {/* module dividers (thin, dark) */}
      {[MOD.aRight, MOD.bRight].map((x) => (
        <mesh key={x} material={m.case} position={[x, yMid, LAN.d / 2]}>
          <boxGeometry args={[0.02, innerH, LAN.d - LAN.shell]} />
        </mesh>
      ))}

      {/* centre bay: brass rail + oak shelf + glow strip */}
      <mesh material={m.brass} position={[MOD.bCenter, LAN.railY, LAN.d / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, LAN.bW - 0.06, 16]} />
      </mesh>
      <mesh material={m.oak} position={[MOD.bCenter, CASE_BOTTOM + 0.34, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.bW - 0.05, 0.024, LAN.d - 0.16]} />
      </mesh>
      <mesh material={m.glowStrip} position={[MOD.bCenter, CASE_BOTTOM + LAN.h - LAN.shell - 0.02, LAN.d / 2 + 0.1]}>
        <boxGeometry args={[LAN.bW - 0.08, 0.008, 0.03]} />
      </mesh>
      <pointLight ref={glowB} position={[MOD.bCenter, 1.25, LAN.d / 2 + 0.3]} color="#ffd9a8" distance={1.9} intensity={1.7} />

      {/* upper shelf with folded knits — the reference's quiet life */}
      <mesh material={m.oak} position={[MOD.bCenter, 1.86, LAN.d / 2]} castShadow>
        <boxGeometry args={[LAN.bW - 0.05, 0.022, LAN.d - 0.2]} />
      </mesh>
      {[
        { x: MOD.bCenter - 0.16, colors: ['#7d3b2d', '#a86c4f', '#3c4a3e'] },
        { x: MOD.bCenter + 0.17, colors: ['#8a8272', '#b7a98c'] },
      ].map((stack) => (
        <group key={stack.x} position={[stack.x, 1.875, LAN.d / 2]}>
          {stack.colors.map((c, i) => (
            <mesh key={c} position={[0, 0.028 + i * 0.052, 0]} castShadow>
              <boxGeometry args={[0.26 - i * 0.015, 0.05, 0.3]} />
              <meshStandardMaterial color={c} roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* module A interior glow (transmits through the linen when closed) */}
      <mesh material={m.glowStrip} position={[MOD.aCenter, CASE_BOTTOM + LAN.h - LAN.shell - 0.02, LAN.d / 2 + 0.08]}>
        <boxGeometry args={[LAN.aW - 0.1, 0.008, 0.03]} />
      </mesh>
      <pointLight ref={glowA} position={[MOD.aCenter, 1.5, LAN.d / 2]} color="#ffd9a8" distance={1.6} intensity={1.3} />

      {/* module A: double linen doors */}
      <group ref={leftLeaf} position={[MOD.aLeft + LAN.shell, yMid, FRONT_Z - 0.02]}>
        <Leaf hinge="left" />
      </group>
      <group ref={rightLeaf} position={[MOD.aRight - 0.01, yMid, FRONT_Z - 0.02]}>
        <Leaf hinge="right" />
      </group>

      {/* module C: golden cane slide in a brass frame */}
      <group ref={cane} position={[0, 0, 0]}>
        <group position={[MOD.cCenter, yMid, FRONT_Z + 0.015]}>
          <mesh material={m.cane}>
            <boxGeometry args={[LAN.cW - 0.03, innerH - 0.04, 0.014]} />
          </mesh>
          {[
            { p: [0, (innerH - 0.04) / 2 - 0.014, 0.002] as const, s: [LAN.cW - 0.03, 0.028, 0.018] as const },
            { p: [0, -(innerH - 0.04) / 2 + 0.014, 0.002] as const, s: [LAN.cW - 0.03, 0.028, 0.018] as const },
            { p: [-(LAN.cW - 0.03) / 2 + 0.014, 0, 0.002] as const, s: [0.028, innerH - 0.04, 0.018] as const },
            { p: [(LAN.cW - 0.03) / 2 - 0.014, 0, 0.002] as const, s: [0.028, innerH - 0.04, 0.018] as const },
          ].map((f, i) => (
            <mesh key={i} material={m.brass} position={f.p as unknown as [number, number, number]}>
              <boxGeometry args={f.s as unknown as [number, number, number]} />
            </mesh>
          ))}
          <mesh material={m.brassBright} position={[-(LAN.cW - 0.03) / 2 + 0.05, -0.04, 0.018]}>
            <boxGeometry args={[0.045, 0.2, 0.012]} />
          </mesh>
        </group>
      </group>
      {/* behind the cane: linen-back archive niche */}
      <mesh material={m.wallLinen} position={[MOD.cCenter, yMid, 0.05]}>
        <boxGeometry args={[LAN.cW - 0.06, innerH - 0.06, 0.02]} />
      </mesh>

      {/* base drawer — felt surface + brass ruler (Insights) */}
      <group ref={drawer} position={[0, LAN.drawerY, LAN.d - 0.34]}>
        <mesh material={m.case}>
          <boxGeometry args={[LAN.w - 0.3, LAN.drawerH, 0.55]} />
        </mesh>
        <mesh material={m.felt} position={[0, LAN.drawerH / 2 - 0.004, 0]}>
          <boxGeometry args={[LAN.w - 0.34, 0.012, 0.51]} />
        </mesh>
        <mesh material={m.brassBright} position={[0.35, LAN.drawerH / 2 + 0.006, 0.1]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.3, 0.006, 0.028]} />
        </mesh>
        <mesh material={m.brass} position={[0, 0, 0.278]}>
          <boxGeometry args={[0.14, 0.016, 0.01]} />
        </mesh>
        <mesh position={[-0.3, LAN.drawerH / 2 + 0.004, -0.05]} rotation={[0, -0.18, 0]}>
          <boxGeometry args={[0.21, 0.004, 0.15]} />
          <meshStandardMaterial color="#efe7d3" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}
