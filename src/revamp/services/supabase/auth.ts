import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthService, AuthStateListener, Session, SignInResult, Unsubscribe } from '../contracts'
import { mapAuthError } from './mapError'
import { toSession } from './session'

/**
 * Supabase Auth adapter. Email sign-in is magic-link (plan §9.2): the
 * session arrives later through the redirect and surfaces via
 * onAuthStateChange, so signInWithEmail resolves with 'link-sent'.
 */
export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithEmail(email: string): Promise<SignInResult> {
    const { error } = await this.client.auth.signInWithOtp({ email })
    if (error) throw mapAuthError(error)
    return { kind: 'link-sent' }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw mapAuthError(error)
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw mapAuthError(error)
    return toSession(data.session)
  }

  onAuthStateChange(listener: AuthStateListener): Unsubscribe {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toSession(session))
    })
    return () => data.subscription.unsubscribe()
  }

  async currentUserId(): Promise<string | null> {
    return (await this.getSession())?.userId ?? null
  }
}
