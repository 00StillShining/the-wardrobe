import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Image, Layers, Palette } from 'lucide-react'
import s from './placeholders.module.css'
import { DESTINATIONS } from '../nav'
import {
  Button,
  EmptyState,
  Menu,
  Segmented,
  Skeleton,
  Tabs,
  TextField,
} from '../../shared/ui'

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
  const [view, setView] = useState<'grid' | 'rail' | 'list'>('grid')
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <PageHead
          title="Collection"
          job="Search, browse, filter, edit and select garments."
          phase="Phase 4–5"
        />
        <div className={s.toolbar}>
          <TextField label="Search" placeholder="Name, brand, notes…" type="search" />
          <div className={s.toolbarRow}>
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'rail', label: 'Rail' },
                { value: 'list', label: 'List' },
              ]}
            />
            <Menu
              trigger="Sort · Newest"
              items={[
                { label: 'Newest', onSelect: () => {} },
                { label: 'Name', onSelect: () => {} },
                { label: 'Brand', onSelect: () => {} },
                { label: 'Most worn', onSelect: () => {} },
              ]}
            />
          </div>
        </div>
        <div className={s.tileGrid} aria-label="Loading placeholder">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={s.tile}>
              <Skeleton height={140} radius="m" />
              <Skeleton height="0.8rem" width="70%" radius="s" />
              <Skeleton height="0.7rem" width="45%" radius="s" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function OutfitsPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <PageHead title="Outfit Studio" job="Assemble, save and revisit outfits." phase="Phase 6" />
        <EmptyState
          figure={<Layers aria-hidden />}
          title="No outfits yet"
          hint="Outfits are layered from your garment cutouts — the studio opens once the collection exists."
          action={<Button disabled>New outfit</Button>}
        />
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
        <PageHead title="Insights" job="Understand value, wear, gaps and purchases." phase="Phase 8" />
        <EmptyState
          title="Not enough data yet"
          hint="Insights are computed from your real wardrobe only — no sample retailer data, ever. Add garments and wear history first."
        />
      </section>
    </div>
  )
}

export function ImportPage() {
  return (
    <div className={s.workspacePane}>
      <section className={s.workspace}>
        <PageHead title="Add / Import" job="Add photographs, URLs or supported receipts." phase="Phase 4" />
      <div className={s.importChoices}>
        <div className={s.importRow}>
          <Image aria-hidden />
          <div className={s.importText}>
            <h3>Choose a photo</h3>
            <p>JPEG, PNG or WebP. The background is removed automatically for review.</p>
          </div>
          <Button disabled>Choose photo</Button>
        </div>
        <div className={s.importRow}>
          <Camera aria-hidden />
          <div className={s.importText}>
            <h3>Capture</h3>
            <p>Use the camera on supported mobile devices.</p>
          </div>
          <Button disabled>Open camera</Button>
        </div>
      </div>
      </section>
    </div>
  )
}

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', content: <p className={s.settingsNote}>Display name, currency and locale — Phase 9.</p> },
  { id: 'preferences', label: 'Preferences', content: <p className={s.settingsNote}>Reduced motion and 3D quality — applied instantly, persisted per account.</p> },
  { id: 'connections', label: 'Connections', content: <p className={s.settingsNote}>Email receipt import appears here only when a provider is configured. Nothing is simulated.</p> },
  { id: 'data', label: 'Data', content: <p className={s.settingsNote}>Storage usage, full export, and account deletion — Phase 9.</p> },
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
  return (
    <div className={s.auth} data-surface="dark">
      <div className={s.authPanel} data-surface="light">
        <p className="wordmark">The Wardrobe</p>
        <h1 className={s.authTitle}>Sign in</h1>
        <TextField label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
        <Button variant="primary" disabled>
          Send magic link
        </Button>
        {/* the operative Phase 1 action gets a real affordance */}
        <Button variant="ghost" onClick={() => navigate('/app')}>
          Continue to the app shell
        </Button>
        <p className={s.authNote}>Accounts arrive in Phase 3 — this screen is layout only.</p>
      </div>
    </div>
  )
}
