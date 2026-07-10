import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import s from './settings.module.css'
import {
  Button,
  ConfirmDialog,
  InlineError,
  SelectField,
  Switch,
  Tabs,
  TextField,
  useToast,
} from '../../shared/ui'
import { useBackend, useSessionState } from '../../app/backend'
import { useScene } from '../../stores/scene'
import type { QualityPreference } from '../../data/types'

function ProfileTab() {
  const backend = useBackend()
  const { profile, refreshProfile } = useSessionState()
  const toast = useToast()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [currency, setCurrency] = useState(profile?.defaultCurrency ?? 'GBP')

  const save = useMutation({
    mutationFn: () => backend.profiles.upsert({ displayName: name.trim() || 'You', defaultCurrency: currency }),
    onSuccess: async () => {
      await refreshProfile()
      toast('Profile saved', { tone: 'success' })
    },
    onError: () => toast('Saving failed.', { tone: 'danger' }),
  })

  return (
    <div className={s.stack}>
      <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <SelectField label="Default currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {['GBP', 'EUR', 'USD'].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </SelectField>
      <div>
        <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
          Save profile
        </Button>
      </div>
    </div>
  )
}

function PreferencesTab() {
  const backend = useBackend()
  const { profile, refreshProfile } = useSessionState()
  const toast = useToast()
  const fullMotion = useScene((st) => st.fullMotion)
  const [quality, setQuality] = useState<QualityPreference>(profile?.qualityPreference ?? 'auto')

  async function persist(patch: { reducedMotion?: boolean; qualityPreference?: QualityPreference }) {
    try {
      await backend.profiles.upsert(patch)
      await refreshProfile()
    } catch {
      toast('Preference could not be saved.', { tone: 'danger' })
    }
  }

  return (
    <div className={s.stack}>
      <Switch
        label="Reduced motion — camera cuts instead of flights"
        checked={!fullMotion}
        onChange={(e) => {
          useScene.getState().setFullMotion(!e.target.checked)
          void persist({ reducedMotion: e.target.checked })
        }}
      />
      <SelectField
        label="3D quality"
        value={quality}
        onChange={(e) => {
          const q = e.target.value as QualityPreference
          setQuality(q)
          // profile stores auto/high/medium/low; the scene knows auto/high/reduced
          useScene.setState({ quality: q === 'auto' ? 'auto' : q === 'high' ? 'high' : 'reduced' })
          void persist({ qualityPreference: q })
        }}
        hint="Auto adapts to the device. Reduced lowers resolution for long battery days."
      >
        <option value="auto">Auto</option>
        <option value="high">High</option>
        <option value="low">Reduced</option>
      </SelectField>
    </div>
  )
}

function DataTab({ seedControls }: { seedControls?: React.ReactNode }) {
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const [usage, setUsage] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => {
        if (e.usage != null) setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB used locally`)
      })
      .catch(() => {})
  }, [])

  const exportData = useMutation({
    mutationFn: async () => {
      const [items, outfits, boards, wearEvents, profile] = await Promise.all([
        backend.wardrobe.list({}),
        backend.outfits.list(),
        backend.styleBoards.list(),
        backend.wear.listEvents(),
        backend.profiles.get(),
      ])
      const payload = {
        exportedAt: new Date().toISOString(),
        format: 'the-wardrobe/v1',
        note: 'Garment metadata export. Original photos live in the app storage; image binaries are not embedded.',
        profile,
        items,
        outfits,
        boards,
        wearEvents,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `wardrobe-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    },
    onSuccess: () => toast('Export downloaded', { tone: 'success' }),
    onError: () => setError('Export failed — nothing was changed.'),
  })

  async function resetLocal() {
    try {
      // local-mode wipe: namespace keys + object stores, then a fresh boot
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('wardrobe2:'))
      keys.forEach((k) => localStorage.removeItem(k))
      const idb = await import('idb-keyval')
      const all = (await idb.keys()) as string[]
      await Promise.all(all.filter((k) => typeof k === 'string').map((k) => idb.del(k)))
      window.location.assign('/auth/sign-in')
    } catch {
      setError('Reset failed part-way — reload and try again.')
    }
  }

  const signOut = useMutation({
    mutationFn: () => backend.auth.signOut(),
    onSuccess: () => navigate('/auth/sign-in', { replace: true }),
  })

  return (
    <div className={s.stack}>
      <p className={s.note}>
        {backend.mode === 'local'
          ? 'Your wardrobe is stored privately on this device. Cloud sync activates when a backend is configured — nothing is simulated.'
          : 'Your wardrobe is stored in your account.'}
        {usage && ` ${usage}.`}
      </p>
      <div className={s.row}>
        <Button onClick={() => exportData.mutate()} loading={exportData.isPending}>
          Export data (JSON)
        </Button>
        <Button variant="quiet" onClick={() => signOut.mutate()} loading={signOut.isPending}>
          Sign out
        </Button>
      </div>
      {seedControls}
      <div className={s.danger}>
        <h3>Danger zone</h3>
        <p className={s.note}>Removes every item, outfit, board and image stored on this device.</p>
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          Delete all local data
        </Button>
      </div>
      {error && <InlineError>{error}</InlineError>}
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetLocal}
        title="Delete everything on this device?"
        body="All garments, outfits, boards, wear history and images stored locally are removed. This cannot be undone."
        confirmLabel="Delete all data"
        danger
      />
    </div>
  )
}

export function SettingsView({ seedControls }: { seedControls?: React.ReactNode }) {
  const [tab, setTab] = useState('profile')
  const backend = useBackend()
  return (
    <Tabs
      label="Settings sections"
      active={tab}
      onChange={setTab}
      tabs={[
        { id: 'profile', label: 'Profile', content: <ProfileTab /> },
        { id: 'preferences', label: 'Preferences', content: <PreferencesTab /> },
        {
          id: 'connections',
          label: 'Connections',
          content: (
            <p className={s.note}>
              No providers are configured{backend.mode === 'local' ? ' — receipt email import and cloud sync appear here once connected. Nothing is simulated.' : '.'}
            </p>
          ),
        },
        { id: 'data', label: 'Data', content: <DataTab seedControls={seedControls} /> },
      ]}
    />
  )
}
