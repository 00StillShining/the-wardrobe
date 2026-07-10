import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import { DoubleSide, SRGBColorSpace, TextureLoader } from 'three'
import { CAB, MODULE_X } from '../cabinet/dims'
import { useSceneItems } from '../../stores/sceneItems'

/**
 * Curated garments hanging on the rails, mirroring the current Collection
 * filter (plan §9.3). Capped at 10 planes — never hundreds of live meshes.
 */

const PLANE_W = 0.42
const PLANE_H = 0.58
const HANG_Y = CAB.railY - 0.33
const HANG_Z = CAB.d / 2 + 0.02

function GarmentPlane({ url, x, tilt }: { url: string; x: number; tilt: number }) {
  const texture = useLoader(TextureLoader, url)
  texture.colorSpace = SRGBColorSpace
  const barY = HANG_Y + PLANE_H / 2 + 0.02
  return (
    <group rotation={[0, tilt, 0]}>
      <mesh position={[x, HANG_Y, HANG_Z]}>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.35} side={DoubleSide} roughness={0.9} />
      </mesh>
      {/* wooden hanger bar + brass hook up to the rail */}
      <mesh position={[x, barY, HANG_Z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, PLANE_W * 0.82, 8]} />
        <meshStandardMaterial color="#8a6f4d" roughness={0.85} />
      </mesh>
      <mesh position={[x, (barY + 1.72) / 2, HANG_Z]}>
        <cylinderGeometry args={[0.004, 0.004, 1.72 - barY, 6]} />
        <meshStandardMaterial color="#b08d57" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function RailGarments() {
  const garments = useSceneItems((s) => s.garments)
  if (garments.length === 0) return null

  // first seven along the main bay, the rest on the archive rail
  const bayA = garments.slice(0, 7)
  const bayC = garments.slice(7)
  const aStart = MODULE_X.aLeft + CAB.frame + PLANE_W / 2 + 0.02
  const cStart = MODULE_X.bcDivider + CAB.frame / 2 + PLANE_W / 2 + 0.02

  return (
    <group>
      {bayA.map((g, i) => (
        <Suspense key={g.id} fallback={null}>
          <GarmentPlane url={g.url} x={aStart + i * 0.115} tilt={(i % 2 === 0 ? 1 : -1) * 0.05} />
        </Suspense>
      ))}
      {bayC.map((g, i) => (
        <Suspense key={g.id} fallback={null}>
          <GarmentPlane url={g.url} x={cStart + i * 0.14} tilt={(i % 2 === 0 ? -1 : 1) * 0.05} />
        </Suspense>
      ))}
    </group>
  )
}
