import { Environment, Lightformer, ContactShadows, Preload } from '@react-three/drei'
import { Spot } from './Spot'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Wardrobe } from './Wardrobe'
import { Room } from './Room'
import { DustMotes } from './DustMotes'
import { CameraRig } from './CameraRig'

export function Experience() {
  return (
    <>
      <fog attach="fog" args={['#14100a', 8.5, 18]} />
      <color attach="background" args={['#14100a']} />

      {/* warm key from upper left — the light that makes the hero, and the
          only shadow-caster (one shadow pass; the fills are shadowless). */}
      <Spot
        position={[-2.7, 3.8, 4.3]}
        target={[0.25, 0.9, 0]}
        angle={0.62}
        penumbra={0.9}
        intensity={38}
        decay={1.15}
        color="#ffdcae"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.025}
      />
      {/* diagonal wash on the wall, left of the wardrobe (no shadow) */}
      <Spot position={[-3.2, 3.1, 2.2]} target={[-1.9, 2.0, -0.7]} angle={0.6} penumbra={1} intensity={16} decay={1.3} color="#f7cf9e" />
      {/* gentle fill on the cabinet's right flank (no shadow) */}
      <Spot position={[2.8, 2.0, 2.6]} target={[0.4, 1.3, 0.2]} angle={0.5} penumbra={1} intensity={6} decay={1.4} color="#b39a7e" />
      {/* faint warm bounce off the floor */}
      <pointLight position={[0.2, 0.25, 1.5]} intensity={1.6} decay={2} color="#e8bd8b" />

      {/* procedural warm-room environment for reflections (no network HDRI) */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" position={[-4, 2.8, 3]} scale={[3, 2.4, 1]} intensity={2.6} color="#ffd5b0" target={[0, 1.2, 0]} />
        <Lightformer form="rect" position={[3.5, 1.6, 2]} scale={[2, 1.6, 1]} intensity={0.5} color="#8f7a5f" target={[0, 1.2, 0]} />
        <Lightformer form="ring" position={[0, 4, 0]} scale={2} intensity={0.35} color="#6e5a41" target={[0, 0, 0]} />
        <Lightformer form="rect" position={[0, -2, 2]} scale={[4, 1.5, 1]} intensity={0.25} color="#41301e" target={[0, 1, 0]} />
      </Environment>

      <Room />
      <Wardrobe />
      <DustMotes />

      {/* the floor contact shadow is essentially static — render it a few
          frames after load, then freeze (no per-frame scene re-render) */}
      <ContactShadows position={[0, 0.002, 0.2]} opacity={0.55} scale={7} blur={2.4} far={2.4} resolution={256} color="#231508" frames={30} />

      <CameraRig />

      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.92} luminanceSmoothing={0.2} />
        <Vignette offset={0.26} darkness={0.5} eskil={false} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>

      <Preload all />
    </>
  )
}
