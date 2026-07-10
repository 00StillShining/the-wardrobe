import { create } from 'zustand'
import { localStorageAdapter as storage } from '../adapters/storage/StorageAdapter'

const PREFERENCES_KEY = 'preferences'

interface StoredPreferences {
  displayName: string
  onboardingComplete: boolean
  reducedMotion: boolean
}

interface PreferencesState extends StoredPreferences {
  ready: boolean
  init: () => void
  setDisplayName: (name: string) => void
  setReducedMotion: (reduced: boolean) => void
  completeOnboarding: () => void
  reset: () => void
}

const defaults: StoredPreferences = {
  displayName: 'My wardrobe',
  onboardingComplete: false,
  reducedMotion: false,
}

function isStoredPreferences(value: unknown): value is StoredPreferences {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.displayName === 'string' &&
    typeof candidate.onboardingComplete === 'boolean' &&
    typeof candidate.reducedMotion === 'boolean'
  )
}

function persist(value: StoredPreferences) {
  storage.writeJSON(PREFERENCES_KEY, value)
}

export const usePreferences = create<PreferencesState>()((set, get) => ({
  ...defaults,
  ready: false,

  init: () => {
    const saved = storage.readJSON<unknown>(PREFERENCES_KEY)
    if (isStoredPreferences(saved)) set({ ...saved, ready: true })
    else {
      persist(defaults)
      set({ ...defaults, ready: true })
    }
  },

  setDisplayName: (displayName) => {
    const next = { displayName: displayName.trim() || defaults.displayName, onboardingComplete: get().onboardingComplete, reducedMotion: get().reducedMotion }
    persist(next)
    set(next)
  },

  setReducedMotion: (reducedMotion) => {
    const next = { displayName: get().displayName, onboardingComplete: get().onboardingComplete, reducedMotion }
    persist(next)
    set(next)
  },

  completeOnboarding: () => {
    const next = { displayName: get().displayName, onboardingComplete: true, reducedMotion: get().reducedMotion }
    persist(next)
    set(next)
  },

  reset: () => set({ ...defaults, ready: false }),
}))
