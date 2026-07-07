import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useNav } from '../state/navigation'

const STATION_NAMES: Record<string, string> = {
  doors: 'The Doors',
  rail: 'The Rail',
}

export function Overlay() {
  const station = useNav((s) => s.station)
  const doorPhase = useNav((s) => s.doorPhase)
  const cutSerial = useNav((s) => s.cutSerial)
  const { active } = useProgress()

  const [loaded, setLoaded] = useState(false)
  const [veil, setVeil] = useState(true)
  const [hint, setHint] = useState(false)
  const cutTimer = useRef<number | undefined>(undefined)

  // Lift the veil once nothing is loading (the doors are the loading screen).
  // Keyed off `active` alone — on warm-cache loads progress never reaches 100.
  // The 350ms grace covers the first-mount tick before Suspense kicks in.
  useEffect(() => {
    if (!active && !loaded) {
      const id = window.setTimeout(() => {
        setLoaded(true)
        setVeil(false)
      }, 350)
      return () => window.clearTimeout(id)
    }
  }, [active, loaded])

  // Reduced-motion navigation = 300ms crossfade
  useEffect(() => {
    if (cutSerial === 0) return
    setVeil(true)
    window.clearTimeout(cutTimer.current)
    cutTimer.current = window.setTimeout(() => setVeil(false), 300)
    return () => window.clearTimeout(cutTimer.current)
  }, [cutSerial])

  // Invite the visitor to turn the key
  useEffect(() => {
    if (loaded && doorPhase === 'closed') {
      const id = window.setTimeout(() => setHint(true), 1400)
      return () => window.clearTimeout(id)
    }
    setHint(false)
  }, [loaded, doorPhase])

  // Keyboard entry
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') useNav.getState().enter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className={`topbar ${loaded ? 'visible' : ''}`}>
        <span className="wordmark">THE WARDROBE</span>
        <span className="crumb smallcaps">{STATION_NAMES[station]}</span>
      </div>
      <div className={`hint smallcaps ${hint ? 'visible' : ''}`}>Turn the key</div>
      <div className={`veil ${veil ? '' : 'lifted'}`} />
    </>
  )
}
