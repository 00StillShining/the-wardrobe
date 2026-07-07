import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useNav } from '../state/navigation'
import { STATIONS, STATION_ORDER } from '../scene/stations'

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

  // Keyboard: Enter/Space turn the key; 1–7 fly between stations
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const nav = useNav.getState()
      if (e.key === 'Enter' || e.key === ' ') {
        nav.enter()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= STATION_ORDER.length) nav.navigate(STATION_ORDER[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const index = STATION_ORDER.indexOf(station)

  return (
    <>
      <div className={`topbar ${loaded ? 'visible' : ''}`}>
        <span className="wordmark">THE WARDROBE</span>
        <span className="crumb smallcaps">
          {index + 1} · {STATIONS[station].name}
        </span>
      </div>
      <div className={`hint smallcaps ${hint ? 'visible' : ''}`}>Turn the key</div>
      <div className={`veil ${veil ? '' : 'lifted'}`} />
    </>
  )
}
