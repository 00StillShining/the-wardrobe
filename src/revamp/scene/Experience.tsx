import { Suspense } from 'react'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Cabinet } from './cabinet/Cabinet'
import { CameraRig } from './CameraRig'
import { RailGarments } from './garments/RailGarments'
import { useGreyboxMaterials } from './cabinet/materials'

function Room() {
  const m = useGreyboxMaterials()
  return (
    <group>
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2.4]} receiveShadow>
        <planeGeometry args={[14, 10]} />
      </mesh>
      <mesh material={m.wall} position={[0, 2.2, -0.02]} receiveShadow>
        <planeGeometry args={[14, 5.2]} />
      </mesh>
    </group>
  )
}

/**
 * Grey-box lighting: neutral soft daylight for shape, one warm key that
 * casts, floor bounce fill. Post-processing waits for final materials —
 * light before texture (grey-box gate).
 */
export function Experience() {
  return (
    <>
      <color attach="background" args={['#1d1c19']} />
      <fog attach="fog" args={['#1d1c19', 7, 14]} />

      {/* physical falloff (decay 2) — intensities sized for ~3-5 m throws */}
      <hemisphereLight args={['#cfd4d8', '#2a2723', 0.9]} />
      <ambientLight intensity={0.22} color="#e8e4da" />
      <spotLight
        position={[-3.2, 3.6, 4.6]}
        angle={0.6}
        penumbra={0.8}
        intensity={340}
        color="#ffe9cf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      {/* warm practical lighting the cabinet front + open-door faces */}
      <pointLight position={[0, 1.7, 2.5]} intensity={46} color="#ffd9a8" />
      {/* cool fill from the right so ebonized panels keep shape */}
      <pointLight position={[2.6, 1.5, 3.4]} intensity={64} color="#d8e0e8" />

      {/* procedural environment — no network HDRI; brass/mirror need it to read */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.1} position={[0, 4, 3]} rotation={[-Math.PI / 2, 0, 0]} scale={[7, 5, 1]} color="#e8ecef" />
        <Lightformer intensity={0.7} position={[-4, 1.6, 2]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2.4, 1]} color="#ffe4c0" />
        <Lightformer intensity={0.5} position={[4, 1.4, 2.5]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 2, 1]} color="#cfd8e0" />
      </Environment>

      <Room />
      <Suspense fallback={null}>
        <Cabinet />
      </Suspense>
      <RailGarments />
      <ContactShadows position={[0, 0.002, 1.2]} opacity={0.45} blur={2.2} scale={7} frames={40} resolution={256} />
      <CameraRig />
    </>
  )
}
