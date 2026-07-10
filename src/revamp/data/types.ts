/**
 * Domain model for the rebuild (plan §9.4 / §10.4).
 *
 * These are the shapes the UI and services speak. They are camelCase and
 * independent of any backend: database rows are mapped explicitly at the
 * persistence boundary (see rows.ts) and never flow raw through the UI
 * (plan §10.2).
 *
 * Dates/timestamps are ISO 8601 strings (timestamptz -> full ISO string,
 * date columns -> 'YYYY-MM-DD').
 */

// ---------------------------------------------------------------------------
// Enum-like unions (mirror the CHECK constraints in 0001_initial_schema.sql)
// ---------------------------------------------------------------------------

export type OwnershipStatus = 'owned' | 'wishlist' | 'archived'

export type SourceType = 'manual' | 'camera' | 'url' | 'receipt' | 'email' | 'import'

/** Image-pipeline status of a wardrobe item ('none' = no photo yet). */
export type ItemProcessingStatus = 'none' | 'pending' | 'processing' | 'ready' | 'failed'

export type ImageKind = 'original' | 'cutout' | 'display' | 'thumbnail'

export type ImageStatus = 'pending' | 'processing' | 'ready' | 'failed'

export type ImportJobStatus =
  | 'created'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'review'
  | 'saving'
  | 'complete'
  | 'failed'
  | 'cancelled'

/** Import job states that still demand attention or work. */
export const ACTIVE_IMPORT_JOB_STATUSES: readonly ImportJobStatus[] = [
  'created',
  'uploading',
  'queued',
  'processing',
  'review',
  'saving',
]

export type QualityPreference = 'auto' | 'high' | 'medium' | 'low'

export type CollectionView = 'rail' | 'grid'

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface Profile {
  /** Same as the auth user id. */
  id: string
  displayName: string
  avatarPath: string | null
  /** ISO 4217 code, e.g. 'GBP'. */
  defaultCurrency: string
  /** BCP 47 tag, e.g. 'en-GB'. */
  locale: string
  reducedMotion: boolean
  qualityPreference: QualityPreference
  defaultCollectionView: CollectionView
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Wardrobe item (full field list per plan §9.4)
// ---------------------------------------------------------------------------

export interface WardrobeItem {
  id: string
  userId: string
  name: string
  brand: string
  category: string
  subcategory: string | null
  /** Garment template / 3D layer type used by the scene and outfit layering. */
  layerType: string
  ownershipStatus: OwnershipStatus
  size: string | null
  /** Hex string, e.g. '#8b6f47'. */
  primaryColor: string | null
  /** Extracted palette of hex strings. */
  palette: string[]
  seasons: string[]
  occasions: string[]
  materialNotes: string | null
  notes: string | null
  pricePaid: number | null
  /** ISO 4217 code for pricePaid. */
  currency: string
  /** 'YYYY-MM-DD'. */
  purchasedAt: string | null
  merchant: string | null
  productUrl: string | null
  sourceType: SourceType
  lastWornAt: string | null
  /** Cached count; derivable from wear events. */
  wearCount: number
  processingStatus: ItemProcessingStatus
  /** Optimistic-concurrency token; increments on every update. */
  version: number
  createdAt: string
  updatedAt: string
  /** Soft delete; deleted rows are excluded from ordinary queries. */
  deletedAt: string | null
}

// ---------------------------------------------------------------------------
// Item images
// ---------------------------------------------------------------------------

export interface ItemImage {
  id: string
  userId: string
  itemId: string
  kind: ImageKind
  /** Object key inside its bucket; always starts with '<user_id>/'. */
  storagePath: string
  mimeType: string
  width: number | null
  height: number | null
  bytes: number | null
  processingVersion: number
  status: ImageStatus
  errorCode: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Outfits
// ---------------------------------------------------------------------------

export interface Outfit {
  id: string
  userId: string
  name: string
  occasion: string | null
  season: string | null
  notes: string | null
  /** Planned wear date, 'YYYY-MM-DD'. */
  plannedFor: string | null
  coverImagePath: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface OutfitItem {
  id: string
  outfitId: string
  itemId: string
  layerSlot: string
  sortOrder: number
  /** Normalized composition values (x/y in 0..1), when composed on canvas. */
  positionX: number | null
  positionY: number | null
  scale: number | null
  rotation: number | null
}

// ---------------------------------------------------------------------------
// Style boards
// ---------------------------------------------------------------------------

export interface StyleBoard {
  id: string
  userId: string
  title: string
  /** Version of the board document format. */
  documentVersion: number
  canvasWidth: number
  canvasHeight: number
  coverImagePath: string | null
  exportImagePath: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface BoardElement {
  id: string
  boardId: string
  userId: string
  /** 'item' | 'media' | 'caption' | 'swatch' | future kinds; payload in `style`. */
  kind: string
  /** Normalized transform: x/y in 0..1 of the canvas. */
  positionX: number
  positionY: number
  scale: number
  rotation: number
  zIndex: number
  locked: boolean
  hidden: boolean
  itemId: string | null
  mediaPath: string | null
  /** Kind-specific style payload, validated by kind in the schema layer. */
  style: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Wear tracking
// ---------------------------------------------------------------------------

export interface WearEvent {
  id: string
  userId: string
  wornAt: string
  outfitId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WearEventItem {
  id: string
  wearEventId: string
  itemId: string
}

// ---------------------------------------------------------------------------
// Import jobs
// ---------------------------------------------------------------------------

export interface ImportJob {
  id: string
  userId: string
  sourceType: SourceType
  status: ImportJobStatus
  /** Whole percent, 0..100, for the active stage. */
  progress: number
  originalPath: string | null
  /** Versioned result payload; parse according to resultSchemaVersion. */
  resultPayload: Record<string, unknown>
  resultSchemaVersion: number
  /** Machine-safe code — never raw provider error text. */
  errorCode: string | null
  /** Translatable message key for the user-facing error. */
  errorMessageKey: string | null
  /** Client-generated key; unique per user so retries cannot duplicate jobs. */
  idempotencyKey: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}
