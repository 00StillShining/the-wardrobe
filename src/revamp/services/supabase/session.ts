/** Shared session helpers for the Supabase implementations. */

import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from '../errors'
import { mapAuthError } from './mapError'
import type { Session } from '../contracts'

interface SupabaseSessionLike {
  user: { id: string; email?: string | null }
}

export const toSession = (session: SupabaseSessionLike | null): Session | null =>
  session ? { userId: session.user.id, email: session.user.email ?? null } : null

/** The authenticated user id, or AppError 'auth' when signed out. */
export const requireUserId = async (client: SupabaseClient): Promise<string> => {
  const { data, error } = await client.auth.getSession()
  if (error) throw mapAuthError(error)
  const userId = data.session?.user.id
  if (!userId) throw new AppError('auth', 'Not signed in')
  return userId
}
