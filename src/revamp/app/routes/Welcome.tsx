import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './placeholders.module.css'
import { Button, InlineError, TextField } from '../../shared/ui'
import { useBackend, useSessionState } from '../backend'

/**
 * Onboarding kept short and connected to value (plan §9.2): name, then
 * straight to adding the first item or exploring the empty wardrobe.
 */
export function WelcomePage() {
  const backend = useBackend()
  const { refreshProfile } = useSessionState()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete(destination: string) {
    setBusy(true)
    setError(null)
    try {
      await backend.profiles.upsert({
        displayName: name.trim() || 'You',
        onboardingCompletedAt: new Date().toISOString(),
      })
      await refreshProfile()
      navigate(destination, { replace: true })
    } catch {
      setError('Could not save your profile. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className={s.auth} data-surface="dark">
      <div className={s.authPanel} data-surface="light">
        <p className="wordmark">The Wardrobe</p>
        <h1 className={s.authTitle}>Make it yours</h1>
        <TextField
          label="What should we call you?"
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        {error && <InlineError>{error}</InlineError>}
        <Button variant="primary" loading={busy} onClick={() => complete('/app/import')}>
          Add your first item
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => complete('/app/collection')}>
          Explore the empty wardrobe
        </Button>
      </div>
    </div>
  )
}
