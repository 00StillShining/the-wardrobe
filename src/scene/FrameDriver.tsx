import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * Frame-rate governor. The Canvas runs in `frameloop="demand"`; this drives a
 * steady ~fps by calling invalidate() on a rAF gate, so the scene renders at a
 * capped rate instead of the display's native refresh (120Hz on ProMotion) —
 * roughly halving GPU work on those panels. (Background tabs are already
 * throttled by the browser's own rAF, so no explicit hidden-tab handling is
 * needed.) Respects reduced-motion by idling lower.
 */
export function FrameDriver({ fps = 60 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = reduced ? 30 : fps
    const interval = 1000 / target
    let raf = 0
    let last = performance.now()

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last >= interval) {
        last = t - ((t - last) % interval)
        invalidate()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fps, invalidate])

  return null
}
