import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Palette } from 'lucide-react'
import s from './placeholders.module.css'
import { DESTINATIONS } from '../nav'
import { Button, EmptyState, InlineError, Tabs, TextField } from '../../shared/ui'
import { useBackend } from '../backend'
import { CollectionView } from '../../features/collection/CollectionView'
import { ItemDetail } from '../../features/collection/ItemDetail'
import { SeedControls } from '../../features/collection/SeedControls'
import { ImportFlow } from '../../features/import/ImportFlow'
import { InsightsView } from '../../features/insights/InsightsView'
import { OutfitsList } from '../../features/outfits/OutfitsList'
import { OutfitStudio } from '../../features/outfits/OutfitStudio'

function PageHead({ title, job, phase }: { title: string; job: string; phase: string }) {
  return (
    <header className={s.head}>
      <h1 className={s.title}>{title}</h1>
      <p className={s.job}>{job}</p>
      <p className={s.phase}>Functional build arrives in {phase}.</p>
    </header>
  )
}

export function OverviewPage() {
  return (
    <div className={s.overview} data-surface="dark">
      <div className={s.overviewPanel}>
        <p className="wordmark">The Wardrobe</p>
        <h1 className={s.overviewTitle}>Your archive, composed.</h1>
        <p className={s.overviewLede}>
          Every destination below is plain navigation too — the scene is never the only way in.
        </p>
        <nav className={s.destGrid} aria-label="Destinations">
          {DESTINATIONS.filter((d) => d.id !== 'overview').map((d) => (
            <Link key={d.id} to={d.path} className={s.destLink}>
              <d.icon aria-hidden />
              <span className={s.destLabel}>{d.label}</span>
              <span className={s.destJob}>{d.job}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function CollectionPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <header className={s.head}>
          <h1 className={s.title}>Collection</h1>
          <p className={s.job}>Search, browse, filter, edit and select garments.</p>
        </header>
        <CollectionView />
      </section>
    </div>
  )
}

export function ItemDetailPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <ItemDetail />
      </section>
    </div>
  )
}

export function OutfitsPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <header className={s.head}>
          <h1 className={s.title}>Outfit Studio</h1>
          <p className={s.job}>Assemble, save and revisit outfits.</p>
        </header>
        <OutfitsList />
      </section>
    </div>
  )
}

export function OutfitStudioPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <header className={s.head}>
          <h1 className={s.title}>Outfit Studio</h1>
          <p className={s.job}>A flat editorial look — layered from your real cutouts, never a fake try-on.</p>
        </header>
        <OutfitStudio />
      </section>
    </div>
  )
}

export function StylePage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <PageHead title="Style Studio" job="Create editorial boards and exports." phase="Phase 7" />
        <EmptyState
          figure={<Palette aria-hidden />}
          title="No boards yet"
          hint="Boards compose cutouts, swatches and captions on a linen canvas, then export at print resolution."
          action={<Button disabled>New board</Button>}
        />
      </section>
    </div>
  )
}

export function InsightsPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <header className={s.head}>
          <h1 className={s.title}>Insights</h1>
          <p className={s.job}>Understand value, wear, gaps and purchases — from your real data only.</p>
        </header>
        <InsightsView />
      </section>
    </div>
  )
}

export function ImportPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <header className={s.head}>
          <h1 className={s.title}>Add / Import</h1>
          <p className={s.job}>Add a garment photograph. URLs and receipts arrive later, honestly.</p>
        </header>
        <ImportFlow />
      </section>
    </div>
  )
}

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', content: <p className={s.settingsNote}>Display name, currency and locale — Phase 9.</p> },
  { id: 'preferences', label: 'Preferences', content: <p className={s.settingsNote}>Reduced motion and 3D quality — applied instantly, persisted per account.</p> },
  { id: 'connections', label: 'Connections', content: <p className={s.settingsNote}>Email receipt import appears here only when a provider is configured. Nothing is simulated.</p> },
  {
    id: 'data',
    label: 'Data',
    content: (
      <div className={s.settingsStack}>
        <p className={s.settingsNote}>Storage usage, full export, and account deletion — Phase 9.</p>
        <SeedControls />
      </div>
    ),
  },
]

export function SettingsPage() {
  const [tab, setTab] = useState('profile')
  return (
    <section className={s.workspaceWide}>
      <PageHead title="Settings" job="Account, preferences, connections and your data." phase="Phase 9" />
      <Tabs label="Settings sections" tabs={SETTINGS_TABS} active={tab} onChange={setTab} />
    </section>
  )
}

export function SignInPage() {
  const navigate = useNavigate()
  const backend = useBackend()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value || !value.includes('@')) {
      setError('Enter the email address for your wardrobe.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await backend.auth.signInWithEmail(value)
      if (result.kind === 'session') {
        const next = new URLSearchParams(window.location.search).get('next')
        navigate(next && next.startsWith('/') ? next : '/app', { replace: true })
      } else {
        setLinkSent(true)
        setBusy(false)
      }
    } catch {
      setError('Sign-in failed. Check the address and try again.')
      setBusy(false)
    }
  }

  return (
    <div className={s.auth} data-surface="dark">
      <form className={s.authPanel} data-surface="light" onSubmit={submit}>
        <p className="wordmark">The Wardrobe</p>
        <h1 className={s.authTitle}>Sign in</h1>
        {linkSent ? (
          <p>Check your email — the sign-in link is on its way.</p>
        ) : (
          <>
            <TextField
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <InlineError>{error}</InlineError>}
            <Button variant="primary" type="submit" loading={busy}>
              {backend.mode === 'local' ? 'Sign in' : 'Send magic link'}
            </Button>
          </>
        )}
        <p className={s.authNote}>
          {backend.mode === 'local'
            ? 'No cloud account is configured yet — your wardrobe is stored privately on this device and moves to your account when cloud sync is connected.'
            : 'We email you a sign-in link. No passwords.'}
        </p>
      </form>
    </div>
  )
}
