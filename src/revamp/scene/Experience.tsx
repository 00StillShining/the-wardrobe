import { Suspense } from 'react'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Lantern } from './lantern/Lantern'
import { Surroundings } from './lantern/Surroundings'
import { CameraRig } from './CameraRig'
import { RailGarments } from './garments/RailGarments'
import { useScene } from '../stores/scene'

/**
 * Scene v2 — the Lantern in a daylit room (scene-v2-lantern.md): soft
 * directional daylight with one shadow pass, sky ambient, interior warm
 * glow, restrained bloom that sells the linen transmission. No motion
 * blur, no flares; reduced quality drops post-processing.
 */
export function Experience() {
  const quality = useScene((s) => s.quality)

  return (
    <>
      <color attach="background" args={['#77756c']} />
      <fog attach="fog" args={['#77756c', 9, 18]} />

      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.3} position={[0, 5, 4]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 6, 1]} color="#eef1f2" />
        <Lightformer intensity={0.8} position={[5, 2.2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 3, 1]} color="#fff0d8" />
        <Lightformer intensity={0.45} position={[-5, 1.8, 2]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2.5, 1]} color="#dfe5e8" />
      </Environment>

      {/* daylight key — raking from the right like the references */}
      <directionalLight
        position={[4.5, 3.6, 3.2]}
        intensity={2.4}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
      />
      <hemisphereLight args={['#e2e6e8', '#8b877c', 0.75]} />
      <ambientLight intensity={0.18} color="#f0eee8" />

      <Surroundings />
      <Suspense fallback={null}>
        <Lantern />
      </Suspense>
      <RailGarments />

      <ContactShadows position={[0, 0.004, 1.1]} opacity={0.48} blur={2.6} scale={8} frames={40} resolution={256} far={2.2} />
      <CameraRig />

      {quality !== 'reduced' && (
        <EffectComposer multisampling={2}>
          <Bloom intensity={0.45} luminanceThreshold={0.9} luminanceSmoothing={0.22} mipmapBlur />
          <Vignette eskil={false} offset={0.16} darkness={0.62} />
        </EffectComposer>
      )}
    </>
  )
}
