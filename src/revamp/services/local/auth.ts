import type { AuthService, AuthStateListener, Session, SignInResult, Unsubscribe } from '../contracts'
import type { KeyValueStore } from './stores'
import { LOCAL_USER_ID, NAMESPACE } from './shared'

const SESSION_KEY = `${NAMESPACE}session`

/**
 * Deterministic fake auth for the local backend: a single user id
 * ('local-user') and an email sign-in that resolves a session immediately —
 * no link round-trip, no network.
 */
export class LocalAuthService implements AuthService {
  private readonly listeners = new Set<AuthStateListener>()

  constructor(private readonly kv: KeyValueStore) {}

  async signInWithEmail(email: string): Promise<SignInResult> {
    const session: Session = { userId: LOCAL_USER_ID, email }
    this.kv.set(SESSION_KEY, JSON.stringify(session))
    this.notify(session)
    return { kind: 'session', session }
  }

  async signOut(): Promise<void> {
    this.kv.remove(SESSION_KEY)
    this.notify(null)
  }

  async getSession(): Promise<Session | null> {
    const raw = this.kv.get(SESSION_KEY)
    if (raw === null) return null
    try {
      const parsed = JSON.parse(raw) as Partial<Session>
      if (typeof parsed.userId !== 'string') return null
      return { userId: parsed.userId, email: typeof parsed.email === 'string' ? parsed.email : null }
    } catch {
      return null
    }
  }

  onAuthStateChange(listener: AuthStateListener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async currentUserId(): Promise<string | null> {
    return (await this.getSession())?.userId ?? null
  }

  private notify(session: Session | null): void {
    for (const listener of this.listeners) listener(session)
  }
}
