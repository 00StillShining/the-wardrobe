/**
 * Wires the Supabase-backed service set (plan §10.1). Uses only the public
 * anon key — authorization is enforced by RLS; no service-role key may ever
 * reach this bundle.
 */

import { createClient } from '@supabase/supabase-js'
import type { Backend } from '../contracts'
import { SupabaseAuthService } from './auth'
import { SupabaseProfileRepository } from './profiles'
import { SupabaseWardrobeRepository } from './wardrobe'
import { SupabaseItemImageRepository } from './itemImages'
import { SupabaseImportJobRepository } from './importJobs'
import { SupabaseOutfitRepository } from './outfits'
import { SupabaseStyleBoardRepository } from './styleBoards'
import { SupabaseWearRepository } from './wear'
import { SupabaseMediaService } from './media'

export interface SupabaseBackendConfig {
  url: string
  anonKey: string
}

export const createSupabaseBackend = (config: SupabaseBackendConfig): Backend => {
  const client = createClient(config.url, config.anonKey)
  return {
    mode: 'supabase',
    auth: new SupabaseAuthService(client),
    profiles: new SupabaseProfileRepository(client),
    wardrobe: new SupabaseWardrobeRepository(client),
    itemImages: new SupabaseItemImageRepository(client),
    importJobs: new SupabaseImportJobRepository(client),
    outfits: new SupabaseOutfitRepository(client),
    styleBoards: new SupabaseStyleBoardRepository(client),
    wear: new SupabaseWearRepository(client),
    media: new SupabaseMediaService(client),
  }
}

export { SupabaseAuthService } from './auth'
export { SupabaseProfileRepository } from './profiles'
export { SupabaseWardrobeRepository } from './wardrobe'
export { SupabaseItemImageRepository } from './itemImages'
export { SupabaseImportJobRepository } from './importJobs'
export { SupabaseOutfitRepository } from './outfits'
export { SupabaseStyleBoardRepository } from './styleBoards'
export { SupabaseWearRepository } from './wear'
export { SupabaseMediaService } from './media'
