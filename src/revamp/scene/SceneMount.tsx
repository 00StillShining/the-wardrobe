import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import s from './SceneMount.module.css'
import { useScene } from '../stores/scene'

const SceneCanvas = lazy(() => import('./SceneCanvas'))

function webglSupported(): boolean {
  if (new URLSearchParams(window.location.search).get('scene') === 'off') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Mounts the persistent 3D layer with a static fallback (plan §9.1: the shell
 * must be usable even if the 3D bundle fails). A reduced-motion station cut
 * shows a 300 ms veil instead of a flight.
 */
export function SceneMount() {
  const supported = useMemo(webglSupported, [])
  const cutSerial = useScene((st) => st.cutSerial)
  const [veil, setVeil] = useState(false)

  useEffect(() => {
    if (cutSerial === 0) return
    setVeil(true)
    const t = window.setTimeout(() => setVeil(false), 300)
    return () => window.clearTimeout(t)
  }, [cutSerial])

  if (!supported) {
    return (
      <div className={s.fallback} aria-hidden>
        <span className="wordmark">The Wardrobe</span>
        <span className={s.fallbackNote}>3D scene unavailable — everything still works.</span>
      </div>
    )
  }

  return (
    <div className={s.layer} aria-hidden>
      <Suspense fallback={<div className={s.loading} />}>
        <SceneCanvas />
      </Suspense>
      <div className={[s.veil, veil && s.veilOn].filter(Boolean).join(' ')} />
    </div>
  )
}
