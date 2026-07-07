import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from './scene/Experience'
import { FrameDriver } from './scene/FrameDriver'
import { Overlay } from './ui/Overlay'
import { useItems } from './state/items'
import { useSheets } from './state/sheets'

export default function App() {
  useEffect(() => {
    void useItems.getState().init()
    useSheets.getState().init()
  }, [])

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 34, near: 0.08, far: 30, position: [0.58, 1.45, 4.95] }}
      >
        <FrameDriver fps={60} />
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <Overlay />
    </>
  )
}
