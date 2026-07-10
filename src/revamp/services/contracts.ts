/**
 * Typed service boundaries (plan §10.3).
 *
 * Interfaces only — every backend (Supabase, local-first, in-memory test
 * doubles) implements these exactly, so features never import a concrete
 * backend. Failures reject with AppError (see errors.ts).
 */

import type {
  ImageKind,
  ImageStatus,
  ImportJob,
  ImportJobStatus,
  ItemImage,
  ItemProcessingStatus,
  BoardElement,
  Outfit,
  OutfitItem,
  OwnershipStatus,
  Profile,
  QualityPreference,
  CollectionView,
  SourceType,
  StyleBoard,
  WardrobeItem,
  WearEvent,
  WearEventItem,
} from '../data/types'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface Session {
  userId: string
  email: string | null
}

export type Unsubscribe = () => void

export type AuthStateListener = (session: Session | null) => void

/**
 * Email sign-in is magic-link first (plan §9.2): the production backend
 * sends a link and the session arrives later through the redirect; the
 * local backend resolves a session immediately.
 */
export type SignInResult =
  | { kind: 'link-sent' }
  | { kind: 'session'; session: Session }

export interface AuthService {
  signInWithEmail(email: string): Promise<SignInResult>
  signOut(): Promise<void>
  getSession(): Promise<Session | null>
  onAuthStateChange(listener: AuthStateListener): Unsubscribe
  currentUserId(): Promise<string | null>
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface ProfileInput {
  displayName?: string
  avatarPath?: string | null
  defaultCurrency?: string
  locale?: string
  reducedMotion?: boolean
  qualityPreference?: QualityPreference
  defaultCollectionView?: CollectionView
  onboardingCompletedAt?: string | null
}

export interface ProfileRepository {
  /** The signed-in user's profile, or null before onboarding creates it. */
  get(): Promise<Profile | null>
  /** Create-or-update the signed-in user's profile with the given fields. */
  upsert(input: ProfileInput): Promise<Profile>
}

// ---------------------------------------------------------------------------
// Wardrobe items
// ---------------------------------------------------------------------------

export type WardrobeSort = 'newest' | 'name' | 'lastWorn' | 'mostWorn'

export interface WardrobeListParams {
  /** Case-insensitive match against name and brand. */
  search?: string
  category?: string
  ownershipStatus?: OwnershipStatus
  /** Item must carry this season tag. */
  season?: string
  /** Item must carry this occasion tag. */
  occasion?: string
  /** Defaults to 'newest'. */
  sort?: WardrobeSort
}

export interface WardrobeItemCreate {
  name: string
  category: string
  layerType: string
  brand?: string
  subcategory?: string | null
  ownershipStatus?: OwnershipStatus
  size?: string | null
  primaryColor?: string | null
  palette?: string[]
  seasons?: string[]
  occasions?: string[]
  materialNotes?: string | null
  notes?: string | null
  pricePaid?: number | null
  currency?: string
  purchasedAt?: string | null
  merchant?: string | null
  productUrl?: string | null
  sourceType?: SourceType
}

export interface WardrobeItemUpdate extends Partial<WardrobeItemCreate> {
  processingStatus?: ItemProcessingStatus
  lastWornAt?: string | null
  /** Cached count; must stay derivable from wear events. */
  wearCount?: number
}

export interface WardrobeRepository {
  /** Non-deleted items only. */
  list(params?: WardrobeListParams): Promise<WardrobeItem[]>
  /** Null when missing or soft-deleted. */
  get(id: string): Promise<WardrobeItem | null>
  create(input: WardrobeItemCreate): Promise<WardrobeItem>
  /**
   * Optimistic concurrency: applies only when the stored version still
   * equals expectedVersion, otherwise rejects with AppError 'conflict'.
   */
  update(id: string, patch: WardrobeItemUpdate, expectedVersion: number): Promise<WardrobeItem>
  /** Preferred over delete for ordinary removal (plan §9.4). */
  archive(id: string): Promise<WardrobeItem>
  /** Sets deleted_at; idempotent on an already-deleted item. */
  softDelete(id: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Item images
// ---------------------------------------------------------------------------

export interface ItemImageCreate {
  itemId: string
  kind: ImageKind
  /** Full storage path as returned by MediaService.upload ('<userId>/...'). */
  storagePath: string
  mimeType: string
  width?: number | null
  height?: number | null
  bytes?: number | null
  processingVersion?: number
  status?: ImageStatus
  errorCode?: string | null
}

export interface ItemImageRepository {
  listForItem(itemId: string): Promise<ItemImage[]>
  create(input: ItemImageCreate): Promise<ItemImage>
  remove(id: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Import jobs
// ---------------------------------------------------------------------------

export interface ImportJobCreate {
  /** Client-generated; the same key always yields the same job. */
  idempotencyKey: string
  sourceType?: SourceType
  originalPath?: string | null
  expiresAt?: string | null
}

export interface ImportJobPatch {
  status?: ImportJobStatus
  /** Whole percent, 0..100. */
  progress?: number
  originalPath?: string | null
  resultPayload?: Record<string, unknown>
  resultSchemaVersion?: number
  errorCode?: string | null
  errorMessageKey?: string | null
}

export interface ImportJobRepository {
  /**
   * Create the job, or return the existing one when this user already
   * created a job with the same idempotency key (retry-safe, plan §9.5).
   */
  createIdempotent(input: ImportJobCreate): Promise<ImportJob>
  updateStatus(id: string, patch: ImportJobPatch): Promise<ImportJob>
  get(id: string): Promise<ImportJob | null>
  /** Jobs not yet complete/failed/cancelled, newest first. */
  listActive(): Promise<ImportJob[]>
}

// ---------------------------------------------------------------------------
// Media (object storage abstraction)
// ---------------------------------------------------------------------------

export type MediaBucket = 'originals' | 'derivatives' | 'exports'

export interface MediaUpload {
  bucket: MediaBucket
  /**
   * Object key relative to the caller's own folder, e.g.
   * 'items/<uuid>/original.jpg'. Implementations prefix the authenticated
   * user id — callers can never write outside their own folder.
   */
  key: string
  blob: Blob
  contentType?: string
  /** Replace an existing object at the same key (default false). */
  upsert?: boolean
}

export interface MediaService {
  /** Returns the full storage path ('<userId>/<key>') to persist in rows. */
  upload(input: MediaUpload): Promise<string>
  /**
   * Short-lived URL for rendering. Re-request when it expires; never
   * persist the returned URL (plan §10.5).
   */
  getObjectUrl(bucket: MediaBucket, path: string): Promise<string>
  delete(bucket: MediaBucket, path: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Image processing (plan §10.6 — one contract, swappable adapters)
// ---------------------------------------------------------------------------

export interface ProcessedImages {
  /** Normalized transparent cutout. */
  cutout: Blob
  /** Display-quality WebP. */
  display: Blob
  /** Small thumbnail. */
  thumb: Blob
  /** Extracted hex palette. */
  palette: string[]
  width: number
  height: number
  /**
   * 0..1 — how confident the processor is that the cutout is real (uniform
   * background found, subject isolated). Low confidence must surface the
   * keep-original fallback in review (plan §9.5); a rectangular original is
   * never presented as a successful cutout.
   */
  keyConfidence?: number
}

export interface ImageProcessingService {
  process(original: Blob): Promise<ProcessedImages>
}

// ---------------------------------------------------------------------------
// Outfits, style boards and wear tracking (Phases 6–8)
// ---------------------------------------------------------------------------

export interface OutfitCreate {
  name: string
  occasion?: string | null
  season?: string | null
  notes?: string | null
  plannedFor?: string | null
  coverImagePath?: string | null
}

export type OutfitUpdate = Partial<OutfitCreate>

export interface OutfitItemInput {
  itemId: string
  layerSlot: string
  sortOrder?: number
  positionX?: number | null
  positionY?: number | null
  scale?: number | null
  rotation?: number | null
}

export interface OutfitRepository {
  /** Non-deleted outfits, newest first. */
  list(): Promise<Outfit[]>
  /** Null when missing or soft-deleted; items come from listItems. */
  get(id: string): Promise<Outfit | null>
  /** Create the outfit, optionally with its initial item set. */
  create(input: OutfitCreate, items?: OutfitItemInput[]): Promise<Outfit>
  update(id: string, patch: OutfitUpdate): Promise<Outfit>
  /**
   * Copy an outfit and its items into a new outfit. The copy's name carries
   * a ' (copy)' suffix so the two stay distinguishable in lists.
   */
  duplicate(id: string): Promise<Outfit>
  /** Sets deleted_at; idempotent on an already-deleted outfit. */
  softDelete(id: string): Promise<void>
  /** The outfit's items, ordered by sortOrder. */
  listItems(outfitId: string): Promise<OutfitItem[]>
  /** Replaces the outfit's item set atomically. */
  setItems(outfitId: string, items: OutfitItemInput[]): Promise<OutfitItem[]>
}

export interface StyleBoardCreate {
  title: string
  canvasWidth: number
  canvasHeight: number
}

export type StyleBoardUpdate = Partial<
  StyleBoardCreate & { coverImagePath: string | null; exportImagePath: string | null }
>

export interface BoardElementInput {
  /** Omit for new elements; pass to update an existing one. */
  id?: string
  kind: string
  positionX: number
  positionY: number
  scale: number
  rotation: number
  zIndex: number
  locked: boolean
  hidden: boolean
  itemId?: string | null
  mediaPath?: string | null
  style?: Record<string, unknown>
}

export interface StyleBoardRepository {
  /** Non-deleted boards, newest first. */
  list(): Promise<StyleBoard[]>
  /** Null when missing or soft-deleted; elements come from listElements. */
  get(id: string): Promise<StyleBoard | null>
  /** New board with documentVersion 1. */
  create(input: StyleBoardCreate): Promise<StyleBoard>
  /**
   * Patch title / canvas size / cover / export paths.
   *
   * documentVersion bump rule: changing the canvas size bumps documentVersion
   * (the canvas is part of the document); title / cover / export path changes
   * are metadata and do not.
   */
  update(id: string, patch: StyleBoardUpdate): Promise<StyleBoard>
  /** Sets deleted_at; idempotent on an already-deleted board. */
  softDelete(id: string): Promise<void>
  /** The board's elements, ordered by zIndex. */
  listElements(boardId: string): Promise<BoardElement[]>
  /**
   * Replaces the board's element set atomically and bumps documentVersion.
   * Elements keep their identity when `id` is passed; timestamps reflect the
   * latest save.
   */
  saveElements(boardId: string, elements: BoardElementInput[]): Promise<BoardElement[]>
}

export interface WearEventCreate {
  /** Defaults to now. */
  wornAt?: string
  outfitId?: string | null
  itemIds: string[]
  notes?: string | null
}

export interface WearRepository {
  /**
   * Create the event plus one wear_event_items row per (deduplicated) item,
   * bumping each item's cached wearCount and moving lastWornAt forward when
   * this event is the item's most recent wear. Rejects with 'validation'
   * when itemIds is empty or names an unknown item.
   */
  logWear(input: WearEventCreate): Promise<WearEvent>
  /** Events with wornAt inside the inclusive range, newest first. */
  listEvents(params?: { from?: string; to?: string }): Promise<WearEvent[]>
  listEventItems(eventId: string): Promise<WearEventItem[]>
  /** Every event that includes the item, newest first. */
  listForItem(itemId: string): Promise<WearEvent[]>
  /**
   * Delete the event and honestly reverse its effect on the cached counters:
   * each affected item's wearCount decrements (floored at zero) and
   * lastWornAt is recomputed from the remaining events (null when none).
   */
  removeEvent(id: string): Promise<void>
}

// ---------------------------------------------------------------------------
// The wired backend a shell receives from createBackend()
// ---------------------------------------------------------------------------

export interface Backend {
  mode: 'supabase' | 'local'
  auth: AuthService
  profiles: ProfileRepository
  wardrobe: WardrobeRepository
  itemImages: ItemImageRepository
  importJobs: ImportJobRepository
  media: MediaService
}
