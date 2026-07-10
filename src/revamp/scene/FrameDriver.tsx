import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useScene } from '../stores/scene'

/**
 * Demand-loop governor: invalidates at ~60 fps (30 under reduced motion) so
 * ProMotion displays don't render at 120 Hz, and stops entirely while the
 * route fully covers the scene. Deliberately NO document.hidden early-return —
 * headless preview reports hidden=true and would freeze (known v1 gotcha).
 */
export function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const s = useScene.getState()
      if (s.paused) return
      const interval = s.fullMotion ? 1000 / 60 : 1000 / 30
      if (t - last >= interval) {
        last = t
        invalidate()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [invalidate])

  return null
}
