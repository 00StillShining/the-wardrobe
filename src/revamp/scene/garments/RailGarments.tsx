import { Suspense, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { DoubleSide, SRGBColorSpace, TextureLoader, type Group } from 'three'
import { LAN, MOD } from '../lantern/dims'
import { useSceneItems } from '../../stores/sceneItems'
import { useScene } from '../../stores/scene'

/**
 * Curated garments hanging in the Lantern's open centre bay, mirroring the
 * current Collection filter (≤10, never hundreds). Gentle idle sway under
 * full motion — wall-clock driven, dead under reduced motion.
 */

const PLANE_W = 0.4
const PLANE_H = 0.56
const HANG_Z = LAN.d / 2 + 0.03
const BAR_Y = LAN.railY - 0.035

function GarmentPlane({ url, x, phase }: { url: string; x: number; phase: number }) {
  const texture = useLoader(TextureLoader, url)
  texture.colorSpace = SRGBColorSpace
  const swing = useRef<Group>(null)

  useFrame(() => {
    if (!swing.current) return
    const s = useScene.getState()
    if (!s.fullMotion) {
      swing.current.rotation.z = 0
      return
    }
    const t = performance.now() / 1000
    // idle sway + a staggered, decaying brush as the camera arrives — the
    // wardrobe acknowledges you (poppy, never restless)
    const idle = Math.sin((t * Math.PI * 2) / 5.2 + phase) * 0.014
    const since = t - s.tStation - phase * 0.06
    const impulse =
      since > 0 && since < 2.4 ? Math.exp(-since * 2.2) * Math.sin(since * 9 + phase) * 0.05 : 0
    swing.current.rotation.z = idle + impulse
  })

  return (
    <group position={[x, LAN.railY, HANG_Z]}>
      {/* pivot at the rail so the sway hangs naturally */}
      <group ref={swing}>
        {/* brass hook */}
        <mesh position={[0, -0.012, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.045, 6]} />
          <meshStandardMaterial color="#b08d57" metalness={1} roughness={0.3} />
        </mesh>
        {/* wooden hanger bar */}
        <mesh position={[0, BAR_Y - LAN.railY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, PLANE_W * 0.8, 8]} />
          <meshStandardMaterial color="#9a7c54" roughness={0.85} />
        </mesh>
        {/* the cutout */}
        <mesh position={[0, BAR_Y - LAN.railY - PLANE_H / 2 - 0.01, 0]}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
          <meshStandardMaterial map={texture} transparent alphaTest={0.35} side={DoubleSide} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

export function RailGarments() {
  const garments = useSceneItems((s) => s.garments)
  if (garments.length === 0) return null

  // the centre bay holds up to six on the rail; the rest wait off-scene
  const bay = garments.slice(0, 6)
  const span = LAN.bW - 0.18
  const step = bay.length > 1 ? span / (bay.length - 1) : 0
  const start = MOD.bCenter - (bay.length > 1 ? span / 2 : 0)

  return (
    <group>
      {bay.map((g, i) => (
        <Suspense key={g.id} fallback={null}>
          <GarmentPlane url={g.url} x={start + i * step} phase={i * 1.7} />
        </Suspense>
      ))}
    </group>
  )
}
