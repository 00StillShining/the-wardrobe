import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useProgress } from '@react-three/drei'
import { LoaderCircle, Plus, Settings } from 'lucide-react'
import { useNav } from '../state/navigation'
import { STATIONS, STATION_ORDER } from '../scene/stations'
import { PostTray } from './PostTray'
import { Ledger } from './Ledger'
import { MirrorPanel } from './MirrorPanel'
import { PinboardPanel } from './PinboardPanel'
import { StationNav } from './StationNav'
import { FilterToggle } from './FilterToggle'
import { SelectModeToggle, SelectionTray } from './SelectionTray'
import { useSheets } from '../state/sheets'
import { useItems } from '../state/items'
import { usePreferences } from '../state/preferences'
import { SettingsPanel } from './SettingsPanel'
import { OnboardingPanel } from './OnboardingPanel'
import { EmptyWardrobe } from './EmptyWardrobe'

const SheetEditor = lazy(() => import('./SheetEditor').then((mod) => ({ default: mod.SheetEditor })))

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}

export function Overlay({ onReset, booting }: { onReset: () => Promise<void>; booting: boolean }) {
  const station = useNav((s) => s.station)
  const doorPhase = useNav((s) => s.doorPhase)
  const cutSerial = useNav((s) => s.cutSerial)
  const editingSheet = useSheets((s) => s.draft !== null)
  const itemsReady = useItems((s) => s.ready)
  const seeding = useItems((s) => s.seeding)
  const itemCount = useItems((s) => s.items.length)
  const preferencesReady = usePreferences((s) => s.ready)
  const onboardingComplete = usePreferences((s) => s.onboardingComplete)
  const completeOnboarding = usePreferences((s) => s.completeOnboarding)
  const { active } = useProgress()

  const [loaded, setLoaded] = useState(false)
  const [veil, setVeil] = useState(true)
  const [hint, setHint] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [manualRequested, setManualRequested] = useState(false)
  const cutTimer = useRef<number | undefined>(undefined)
  const settingsButton = useRef<HTMLButtonElement | null>(null)

  // Lift the veil once nothing is loading (the doors are the loading screen).
  // Keyed off `active` alone — on warm-cache loads progress never reaches 100.
  // The 350ms grace covers the first-mount tick before Suspense kicks in.
  useEffect(() => {
    if (!active && !seeding && !booting && !loaded) {
      const id = window.setTimeout(() => {
        setLoaded(true)
        setVeil(false)
      }, 350)
      return () => window.clearTimeout(id)
    }
  }, [active, booting, loaded, seeding])

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
      if (isInteractiveTarget(e.target)) return

      if (e.key === 'Enter' || e.key === ' ') {
        if (nav.doorPhase === 'closed') {
          e.preventDefault()
          nav.enter()
        }
        return
      }

      if (nav.doorPhase !== 'open') return
      const n = Number(e.key)
      if (n >= 1 && n <= STATION_ORDER.length) nav.navigate(STATION_ORDER[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const index = STATION_ORDER.indexOf(station)
  const open = doorPhase === 'open'
  const atBrowse = open && (station === 'rail' || station === 'shelves')
  const busy = active || seeding || booting
  const busyLabel = active ? 'Loading room' : seeding ? 'Preparing garments' : 'Opening wardrobe'

  const openAddItem = useCallback(() => {
    completeOnboarding()
    setSettingsOpen(false)
    setManualRequested(true)
    useNav.getState().navigate('post')
  }, [completeOnboarding])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    window.requestAnimationFrame(() => settingsButton.current?.focus())
  }, [])

  return (
    <>
      <div className={`topbar ${loaded ? 'visible' : ''}`}>
        <button
          type="button"
          className={`wordmark ${open ? 'clickable' : ''}`}
          onClick={() => useNav.getState().navigate('doors')}
          disabled={!open}
          aria-label="Return to wardrobe overview"
        >
          THE WARDROBE
        </button>
        <div className="topbar-actions">
          <span className="crumb smallcaps">
            {station === 'doors' ? 'Overview' : `${String(index).padStart(2, '0')} · ${STATIONS[station].name}`}
          </span>
          {open && (
            <button type="button" className="topbar-command" onClick={openAddItem}>
              <Plus size={14} aria-hidden="true" /> Add item
            </button>
          )}
          {open && (
            <button ref={settingsButton} type="button" className="topbar-icon" onClick={() => setSettingsOpen(true)} aria-label="Open account and settings" title="Account and settings">
              <Settings size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="overlay-root">
        <AnimatePresence>{open && <StationNav key="snav" />}</AnimatePresence>
        <AnimatePresence>{atBrowse && <FilterToggle key="filter" />}</AnimatePresence>
        <AnimatePresence>{atBrowse && <SelectModeToggle key="selmode" />}</AnimatePresence>
        <AnimatePresence>{open && station === 'post' && <PostTray key="post" startManual={manualRequested} onManualOpened={() => setManualRequested(false)} />}</AnimatePresence>
        <AnimatePresence>{open && station === 'ledger' && <Ledger key="ledger" />}</AnimatePresence>
        <AnimatePresence>{open && station === 'mirror' && <MirrorPanel key="mirror" />}</AnimatePresence>
        <AnimatePresence>{open && station === 'pinboard' && !editingSheet && <PinboardPanel key="pin" />}</AnimatePresence>
        <AnimatePresence>{atBrowse && itemsReady && itemCount === 0 && <EmptyWardrobe key="empty" onAdd={openAddItem} />}</AnimatePresence>
        <SelectionTray />
      </div>

      <div className={`hint smallcaps ${hint ? 'visible' : ''}`}>Turn the key</div>
      <div className={`boot-status ${busy ? 'visible' : ''}`} role="status">
        <LoaderCircle className="spin" size={15} aria-hidden="true" /> {busyLabel}
      </div>
      <div className={`veil ${veil ? '' : 'lifted'}`} />

      <AnimatePresence>
        {open && preferencesReady && !onboardingComplete && !settingsOpen && (
          <OnboardingPanel key="onboarding" onAdd={openAddItem} onExplore={completeOnboarding} />
        )}
        {settingsOpen && <SettingsPanel key="settings" onClose={closeSettings} onReset={onReset} />}
      </AnimatePresence>

      {editingSheet && (
        <Suspense fallback={null}>
          <SheetEditor />
        </Suspense>
      )}
    </>
  )
}
