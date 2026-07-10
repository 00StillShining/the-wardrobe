import { Canvas } from '@react-three/fiber'
import { Experience } from './Experience'
import { FrameDriver } from './FrameDriver'
import { STATIONS } from './stations'

/**
 * The single persistent Canvas — lazy-loaded so Three.js never enters the 2D
 * bundles (plan §11). Demand frameloop + dpr cap are the v1-proven budget.
 */
export default function SceneCanvas() {
  const start = STATIONS.overview
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
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
