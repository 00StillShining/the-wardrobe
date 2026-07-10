import { Canvas } from '@react-three/fiber'
import { Experience } from './Experience'
import { FrameDriver } from './FrameDriver'
import { STATIONS } from './stations'
import { useScene } from '../stores/scene'

const DPR: Record<string, number | [number, number]> = {
  auto: [1, 1.5],
  high: [1, 2],
  reduced: 1,
}

/**
 * The single persistent Canvas — lazy-loaded so Three.js never enters the 2D
 * bundles (plan §11). Demand frameloop + dpr cap are the v1-proven budget;
 * the quality preference (plan §9.9) adjusts DPR live.
 */
export default function SceneCanvas() {
  const quality = useScene((s) => s.quality)
  const start = STATIONS.overview
  return (
    <Canvas
      shadows
      dpr={DPR[quality]}
      frameloop="demand"
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{
        fov: 34,
        near: 0.08,
        far: 30,
        position: [start.pos.x, start.pos.y, start.pos.z],
      }}
    >
      <FrameDriver />
      <Experience />
    </Canvas>
  )
}
