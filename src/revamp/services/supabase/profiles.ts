import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProfileInput, ProfileRepository } from '../contracts'
import type { Profile } from '../../data/types'
import { profileFromRow, type ProfileRow } from '../../data/rows'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

/** Snake-case only the fields the caller actually provided. */
const rowPatchFromInput = (input: ProfileInput): Record<string, unknown> => {
  const patch: Record<string, unknown> = {}
  if (input.displayName !== undefined) patch.display_name = input.displayName
  if (input.avatarPath !== undefined) patch.avatar_path = input.avatarPath
  if (input.defaultCurrency !== undefined) patch.default_currency = input.defaultCurrency
  if (input.locale !== undefined) patch.locale = input.locale
  if (input.reducedMotion !== undefined) patch.reduced_motion = input.reducedMotion
  if (input.qualityPreference !== undefined) patch.quality_preference = input.qualityPreference
  if (input.defaultCollectionView !== undefined) {
    patch.default_collection_view = input.defaultCollectionView
  }
  if (input.onboardingCompletedAt !== undefined) {
    patch.onboarding_completed_at = input.onboardingCompletedAt
  }
  return patch
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<Profile | null> {
    const userId = await requireUserId(this.client)
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    return data ? profileFromRow(data as ProfileRow) : null
  }

  async upsert(input: ProfileInput): Promise<Profile> {
    const userId = await requireUserId(this.client)
    const { data, error } = await this.client
      .from('profiles')
      .upsert({ id: userId, ...rowPatchFromInput(input) })
      .select()
      .single()
    if (error) throw mapPostgrestError(error)
    return profileFromRow(data as ProfileRow)
  }
}
