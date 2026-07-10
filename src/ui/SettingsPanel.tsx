import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Database, LoaderCircle, RotateCcw, Save, ShieldCheck, UserRound, X } from 'lucide-react'
import { useItems } from '../state/items'
import { useNav } from '../state/navigation'
import { usePreferences } from '../state/preferences'
import { useSheets } from '../state/sheets'

export function SettingsPanel({ onClose, onReset }: { onClose: () => void; onReset: () => Promise<void> }) {
  const displayName = usePreferences((s) => s.displayName)
  const reducedMotion = usePreferences((s) => s.reducedMotion)
  const setDisplayName = usePreferences((s) => s.setDisplayName)
  const setReducedMotion = usePreferences((s) => s.setReducedMotion)
  const itemCount = useItems((s) => s.items.length)
  const sheetCount = useSheets((s) => s.sheets.length)
  const [name, setName] = useState(displayName)
  const [saved, setSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetFailed, setResetFailed] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault()
    setDisplayName(name)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const changeMotion = (reduced: boolean) => {
    setReducedMotion(reduced)
    useNav.setState({ fullMotion: !reduced })
  }

  const reset = async () => {
    if (!window.confirm('Reset all wardrobe data stored on this device?')) return
    setResetting(true)
    setResetFailed(false)
    try {
      await onReset()
      onClose()
    } catch (error) {
      console.warn('[storage] reset failed', error)
      setResetFailed(true)
    } finally {
      setResetting(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section
        className="settings-panel paper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        initial={{ opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.985 }}
        transition={{ duration: 0.22 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="panel-heading">
          <div>
            <span className="panel-kicker">Local workspace</span>
            <h2 id="settings-title" className="paper-serif">Account & settings</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close settings" onClick={onClose} autoFocus>
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="account-summary">
          <span className="account-avatar" aria-hidden="true"><UserRound size={20} /></span>
          <span>
            <strong>{displayName}</strong>
            <small><ShieldCheck size={12} aria-hidden="true" /> Stored on this device</small>
          </span>
        </div>

        <form className="settings-section" onSubmit={saveProfile}>
          <div className="section-title">Profile</div>
          <label className="field-label" htmlFor="display-name">Display name</label>
          <div className="inline-field">
            <input id="display-name" className="mfield" value={name} maxLength={48} onChange={(event) => setName(event.target.value)} />
            <button type="submit" className="btn btn-ghost icon-text-button">
              {saved ? <Check size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </form>

        <div className="settings-section">
          <div className="section-title">Preferences</div>
          <label className="setting-row">
            <span>
              <strong>Reduce motion</strong>
              <small>Use quick fades between wardrobe stations</small>
            </span>
            <input type="checkbox" checked={reducedMotion} onChange={(event) => changeMotion(event.target.checked)} />
          </label>
        </div>

        <div className="settings-section">
          <div className="section-title">Storage</div>
          <div className="storage-summary">
            <Database size={17} aria-hidden="true" />
            <span><strong>{itemCount}</strong> pieces</span>
            <span><strong>{sheetCount}</strong> style sheets</span>
          </div>
          <button type="button" className="btn danger-button icon-text-button" onClick={reset} disabled={resetting}>
            {resetting ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
            {resetting ? 'Resetting' : 'Reset local wardrobe'}
          </button>
          <AnimatePresence>
            {resetFailed && <motion.p className="inline-error" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Reset failed. Check browser storage access and try again.</motion.p>}
          </AnimatePresence>
        </div>
      </motion.section>
    </motion.div>
  )
}
