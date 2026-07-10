import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { backendMode, productionMisconfigured } from '../config/env'
import { createBackend } from '../services'
import type { Backend, Session } from '../services/contracts'
import type { Profile } from '../data/types'

const BackendContext = createContext<Backend | null>(null)

interface SessionState {
  /** undefined = still resolving; null = signed out */
  session: Session | null | undefined
  profile: Profile | null | undefined
  refreshProfile: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function useBackend(): Backend {
  const b = useContext(BackendContext)
  if (!b) throw new Error('useBackend must be used inside <BackendProvider>')
  return b
}

export function useSessionState(): SessionState {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSessionState must be used inside <BackendProvider>')
  return s
}

/** Fail-closed production screen (plan §11): never run prod on local storage silently. */
function Misconfigured() {
  return (
    <div style={{ display: 'grid', placeContent: 'center', minHeight: '100dvh', gap: 8, textAlign: 'center' }}>
      <p className="wordmark">The Wardrobe</p>
      <p>This deployment is missing its backend configuration.</p>
      <p style={{ color: 'var(--text-muted)' }}>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.</p>
    </div>
  )
}

export function BackendProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => createBackend(backendMode()), [])
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  useEffect(() => {
    let live = true
    backend.auth.getSession().then((s) => {
      if (live) setSession(s)
    })
    const unsubscribe = backend.auth.onAuthStateChange((s) => setSession(s))
    return () => {
      live = false
      unsubscribe()
    }
  }, [backend])

  useEffect(() => {
    let live = true
    if (!session) {
      setProfile(session === null ? null : undefined)
      return
    }
    backend.profiles.get().then(
      (p) => live && setProfile(p),
      () => live && setProfile(null),
    )
    return () => {
      live = false
    }
  }, [backend, session])

  const state = useMemo<SessionState>(
    () => ({
      session,
      profile,
      refreshProfile: async () => {
        const p = await backend.profiles.get()
        setProfile(p)
      },
    }),
    [backend, session, profile],
  )

  if (productionMisconfigured) return <Misconfigured />

  return (
    <BackendContext.Provider value={backend}>
      <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
    </BackendContext.Provider>
  )
}

/** Auth guard: unauthenticated users go to sign-in, intended route preserved. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSessionState()
  const location = useLocation()
  if (session === undefined) return null
  if (session === null) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/sign-in?next=${next}`} replace />
  }
  return <>{children}</>
}

/** First-run gate: no completed profile → the welcome step (plan §9.2). */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { profile } = useSessionState()
  if (profile === undefined) return null
  if (profile === null || !profile.onboardingCompletedAt) return <Navigate to="/app/welcome" replace />
  return <>{children}</>
}
