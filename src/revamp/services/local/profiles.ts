import type { ProfileInput, ProfileRepository } from '../contracts'
import type { Profile } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNow, LOCAL_USER_ID, NAMESPACE, type LocalClock } from './shared'

const PROFILE_KEY = `${NAMESPACE}profile`

const defaultProfile = (now: string): Profile => ({
  id: LOCAL_USER_ID,
  displayName: '',
  avatarPath: null,
  defaultCurrency: 'GBP',
  locale: 'en-GB',
  reducedMotion: false,
  qualityPreference: 'auto',
  defaultCollectionView: 'rail',
  onboardingCompletedAt: null,
  createdAt: now,
  updatedAt: now,
})

export class LocalProfileRepository implements ProfileRepository {
  private readonly now: () => string

  constructor(
    private readonly kv: KeyValueStore,
    clock: LocalClock = {},
  ) {
    this.now = clock.now ?? defaultNow
  }

  async get(): Promise<Profile | null> {
    const raw = this.kv.get(PROFILE_KEY)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as Profile
    } catch (cause) {
      throw new AppError('storage', `Corrupt local data under '${PROFILE_KEY}'`, cause)
    }
  }

  async upsert(input: ProfileInput): Promise<Profile> {
    const existing = await this.get()
    const base = existing ?? defaultProfile(this.now())
    const next: Profile = {
      ...base,
      displayName: input.displayName !== undefined ? input.displayName : base.displayName,
      avatarPath: input.avatarPath !== undefined ? input.avatarPath : base.avatarPath,
      defaultCurrency:
        input.defaultCurrency !== undefined ? input.defaultCurrency : base.defaultCurrency,
      locale: input.locale !== undefined ? input.locale : base.locale,
      reducedMotion: input.reducedMotion !== undefined ? input.reducedMotion : base.reducedMotion,
      qualityPreference:
        input.qualityPreference !== undefined ? input.qualityPreference : base.qualityPreference,
      defaultCollectionView:
        input.defaultCollectionView !== undefined
          ? input.defaultCollectionView
          : base.defaultCollectionView,
      onboardingCompletedAt:
        input.onboardingCompletedAt !== undefined
          ? input.onboardingCompletedAt
          : base.onboardingCompletedAt,
      updatedAt: this.now(),
    }
    this.kv.set(PROFILE_KEY, JSON.stringify(next))
    return next
  }
}
