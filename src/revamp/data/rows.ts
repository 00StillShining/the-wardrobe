/**
 * Database row shapes (snake_case, mirroring supabase/migrations/0001) and
 * explicit row <-> domain mappers for the Supabase service implementations.
 *
 * Rows exist ONLY at the persistence boundary: repositories fetch rows, map
 * them to domain types, and hand the UI domain types (plan §10.2). Mappers
 * are written for the entities the Supabase impls persist today; when the
 * generated database types are adopted these row shapes become assignable
 * aliases of them.
 */

import type {
  CollectionView,
  ImageKind,
  ImageStatus,
  ImportJob,
  ImportJobStatus,
  ItemImage,
  ItemProcessingStatus,
  OwnershipStatus,
  Profile,
  QualityPreference,
  SourceType,
  WardrobeItem,
} from './types'

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string
  display_name: string
  avatar_path: string | null
  default_currency: string
  locale: string
  reduced_motion: boolean
  quality_preference: QualityPreference
  default_collection_view: CollectionView
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

export const profileFromRow = (row: ProfileRow): Profile => ({
  id: row.id,
  displayName: row.display_name,
  avatarPath: row.avatar_path,
  defaultCurrency: row.default_currency,
  locale: row.locale,
  reducedMotion: row.reduced_motion,
  qualityPreference: row.quality_preference,
  defaultCollectionView: row.default_collection_view,
  onboardingCompletedAt: row.onboarding_completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const profileToRow = (profile: Profile): ProfileRow => ({
  id: profile.id,
  display_name: profile.displayName,
  avatar_path: profile.avatarPath,
  default_currency: profile.defaultCurrency,
  locale: profile.locale,
  reduced_motion: profile.reducedMotion,
  quality_preference: profile.qualityPreference,
  default_collection_view: profile.defaultCollectionView,
  onboarding_completed_at: profile.onboardingCompletedAt,
  created_at: profile.createdAt,
  updated_at: profile.updatedAt,
})

// ---------------------------------------------------------------------------
// wardrobe_items
// ---------------------------------------------------------------------------

export interface WardrobeItemRow {
  id: string
  user_id: string
  name: string
  brand: string
  category: string
  subcategory: string | null
  layer_type: string
  ownership_status: OwnershipStatus
  size: string | null
  primary_color: string | null
  palette: string[]
  seasons: string[]
  occasions: string[]
  material_notes: string | null
  notes: string | null
  price_paid: number | null
  currency: string
  purchased_at: string | null
  merchant: string | null
  product_url: string | null
  source_type: SourceType
  last_worn_at: string | null
  wear_count: number
  processing_status: ItemProcessingStatus
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export const wardrobeItemFromRow = (row: WardrobeItemRow): WardrobeItem => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  brand: row.brand,
  category: row.category,
  subcategory: row.subcategory,
  layerType: row.layer_type,
  ownershipStatus: row.ownership_status,
  size: row.size,
  primaryColor: row.primary_color,
  palette: [...row.palette],
  seasons: [...row.seasons],
  occasions: [...row.occasions],
  materialNotes: row.material_notes,
  notes: row.notes,
  pricePaid: row.price_paid,
  currency: row.currency,
  purchasedAt: row.purchased_at,
  merchant: row.merchant,
  productUrl: row.product_url,
  sourceType: row.source_type,
  lastWornAt: row.last_worn_at,
  wearCount: row.wear_count,
  processingStatus: row.processing_status,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
})

export const wardrobeItemToRow = (item: WardrobeItem): WardrobeItemRow => ({
  id: item.id,
  user_id: item.userId,
  name: item.name,
  brand: item.brand,
  category: item.category,
  subcategory: item.subcategory,
  layer_type: item.layerType,
  ownership_status: item.ownershipStatus,
  size: item.size,
  primary_color: item.primaryColor,
  palette: [...item.palette],
  seasons: [...item.seasons],
  occasions: [...item.occasions],
  material_notes: item.materialNotes,
  notes: item.notes,
  price_paid: item.pricePaid,
  currency: item.currency,
  purchased_at: item.purchasedAt,
  merchant: item.merchant,
  product_url: item.productUrl,
  source_type: item.sourceType,
  last_worn_at: item.lastWornAt,
  wear_count: item.wearCount,
  processing_status: item.processingStatus,
  version: item.version,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
  deleted_at: item.deletedAt,
})

// ---------------------------------------------------------------------------
// item_images
// ---------------------------------------------------------------------------

export interface ItemImageRow {
  id: string
  user_id: string
  item_id: string
  kind: ImageKind
  storage_path: string
  mime_type: string
  width: number | null
  height: number | null
  bytes: number | null
  processing_version: number
  status: ImageStatus
  error_code: string | null
  created_at: string
  updated_at: string
}

export const itemImageFromRow = (row: ItemImageRow): ItemImage => ({
  id: row.id,
  userId: row.user_id,
  itemId: row.item_id,
  kind: row.kind,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  width: row.width,
  height: row.height,
  bytes: row.bytes,
  processingVersion: row.processing_version,
  status: row.status,
  errorCode: row.error_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const itemImageToRow = (image: ItemImage): ItemImageRow => ({
  id: image.id,
  user_id: image.userId,
  item_id: image.itemId,
  kind: image.kind,
  storage_path: image.storagePath,
  mime_type: image.mimeType,
  width: image.width,
  height: image.height,
  bytes: image.bytes,
  processing_version: image.processingVersion,
  status: image.status,
  error_code: image.errorCode,
  created_at: image.createdAt,
  updated_at: image.updatedAt,
})

// ---------------------------------------------------------------------------
// import_jobs
// ---------------------------------------------------------------------------

export interface ImportJobRow {
  id: string
  user_id: string
  source_type: SourceType
  status: ImportJobStatus
  progress: number
  original_path: string | null
  result_payload: Record<string, unknown>
  result_schema_version: number
  error_code: string | null
  error_message_key: string | null
  idempotency_key: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export const importJobFromRow = (row: ImportJobRow): ImportJob => ({
  id: row.id,
  userId: row.user_id,
  sourceType: row.source_type,
  status: row.status,
  progress: row.progress,
  originalPath: row.original_path,
  resultPayload: { ...row.result_payload },
  resultSchemaVersion: row.result_schema_version,
  errorCode: row.error_code,
  errorMessageKey: row.error_message_key,
  idempotencyKey: row.idempotency_key,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const importJobToRow = (job: ImportJob): ImportJobRow => ({
  id: job.id,
  user_id: job.userId,
  source_type: job.sourceType,
  status: job.status,
  progress: job.progress,
  original_path: job.originalPath,
  result_payload: { ...job.resultPayload },
  result_schema_version: job.resultSchemaVersion,
  error_code: job.errorCode,
  error_message_key: job.errorMessageKey,
  idempotency_key: job.idempotencyKey,
  expires_at: job.expiresAt,
  created_at: job.createdAt,
  updated_at: job.updatedAt,
})
