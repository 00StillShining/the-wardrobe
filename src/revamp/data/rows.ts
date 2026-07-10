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
  BoardElement,
  CollectionView,
  ImageKind,
  ImageStatus,
  ImportJob,
  ImportJobStatus,
  ItemImage,
  ItemProcessingStatus,
  Outfit,
  OutfitItem,
  OwnershipStatus,
  Profile,
  QualityPreference,
  SourceType,
  StyleBoard,
  WardrobeItem,
  WearEvent,
  WearEventItem,
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

// ---------------------------------------------------------------------------
// outfits
// ---------------------------------------------------------------------------

export interface OutfitRow {
  id: string
  user_id: string
  name: string
  occasion: string | null
  season: string | null
  notes: string | null
  planned_for: string | null
  cover_image_path: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export const outfitFromRow = (row: OutfitRow): Outfit => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  occasion: row.occasion,
  season: row.season,
  notes: row.notes,
  plannedFor: row.planned_for,
  coverImagePath: row.cover_image_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
})

export const outfitToRow = (outfit: Outfit): OutfitRow => ({
  id: outfit.id,
  user_id: outfit.userId,
  name: outfit.name,
  occasion: outfit.occasion,
  season: outfit.season,
  notes: outfit.notes,
  planned_for: outfit.plannedFor,
  cover_image_path: outfit.coverImagePath,
  created_at: outfit.createdAt,
  updated_at: outfit.updatedAt,
  deleted_at: outfit.deletedAt,
})

// ---------------------------------------------------------------------------
// outfit_items
//
// The table also carries created_at / updated_at (trigger-maintained); the
// domain type deliberately omits them, so the row shape the client reads and
// writes does too — extra columns returned by select('*') are ignored.
// ---------------------------------------------------------------------------

export interface OutfitItemRow {
  id: string
  outfit_id: string
  item_id: string
  layer_slot: string
  sort_order: number
  position_x: number | null
  position_y: number | null
  scale: number | null
  rotation: number | null
}

export const outfitItemFromRow = (row: OutfitItemRow): OutfitItem => ({
  id: row.id,
  outfitId: row.outfit_id,
  itemId: row.item_id,
  layerSlot: row.layer_slot,
  sortOrder: row.sort_order,
  positionX: row.position_x,
  positionY: row.position_y,
  scale: row.scale,
  rotation: row.rotation,
})

export const outfitItemToRow = (item: OutfitItem): OutfitItemRow => ({
  id: item.id,
  outfit_id: item.outfitId,
  item_id: item.itemId,
  layer_slot: item.layerSlot,
  sort_order: item.sortOrder,
  position_x: item.positionX,
  position_y: item.positionY,
  scale: item.scale,
  rotation: item.rotation,
})

// ---------------------------------------------------------------------------
// style_boards
// ---------------------------------------------------------------------------

export interface StyleBoardRow {
  id: string
  user_id: string
  title: string
  document_version: number
  canvas_width: number
  canvas_height: number
  cover_image_path: string | null
  export_image_path: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export const styleBoardFromRow = (row: StyleBoardRow): StyleBoard => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  documentVersion: row.document_version,
  canvasWidth: row.canvas_width,
  canvasHeight: row.canvas_height,
  coverImagePath: row.cover_image_path,
  exportImagePath: row.export_image_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
})

export const styleBoardToRow = (board: StyleBoard): StyleBoardRow => ({
  id: board.id,
  user_id: board.userId,
  title: board.title,
  document_version: board.documentVersion,
  canvas_width: board.canvasWidth,
  canvas_height: board.canvasHeight,
  cover_image_path: board.coverImagePath,
  export_image_path: board.exportImagePath,
  created_at: board.createdAt,
  updated_at: board.updatedAt,
  deleted_at: board.deletedAt,
})

// ---------------------------------------------------------------------------
// board_elements
// ---------------------------------------------------------------------------

export interface BoardElementRow {
  id: string
  board_id: string
  user_id: string
  kind: string
  position_x: number
  position_y: number
  scale: number
  rotation: number
  z_index: number
  locked: boolean
  hidden: boolean
  item_id: string | null
  media_path: string | null
  style: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const boardElementFromRow = (row: BoardElementRow): BoardElement => ({
  id: row.id,
  boardId: row.board_id,
  userId: row.user_id,
  kind: row.kind,
  positionX: row.position_x,
  positionY: row.position_y,
  scale: row.scale,
  rotation: row.rotation,
  zIndex: row.z_index,
  locked: row.locked,
  hidden: row.hidden,
  itemId: row.item_id,
  mediaPath: row.media_path,
  style: { ...row.style },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const boardElementToRow = (element: BoardElement): BoardElementRow => ({
  id: element.id,
  board_id: element.boardId,
  user_id: element.userId,
  kind: element.kind,
  position_x: element.positionX,
  position_y: element.positionY,
  scale: element.scale,
  rotation: element.rotation,
  z_index: element.zIndex,
  locked: element.locked,
  hidden: element.hidden,
  item_id: element.itemId,
  media_path: element.mediaPath,
  style: { ...element.style },
  created_at: element.createdAt,
  updated_at: element.updatedAt,
})

// ---------------------------------------------------------------------------
// wear_events
// ---------------------------------------------------------------------------

export interface WearEventRow {
  id: string
  user_id: string
  worn_at: string
  outfit_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const wearEventFromRow = (row: WearEventRow): WearEvent => ({
  id: row.id,
  userId: row.user_id,
  wornAt: row.worn_at,
  outfitId: row.outfit_id,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const wearEventToRow = (event: WearEvent): WearEventRow => ({
  id: event.id,
  user_id: event.userId,
  worn_at: event.wornAt,
  outfit_id: event.outfitId,
  notes: event.notes,
  created_at: event.createdAt,
  updated_at: event.updatedAt,
})

// ---------------------------------------------------------------------------
// wear_event_items
//
// Like outfit_items, the table's trigger-maintained created_at / updated_at
// are deliberately absent from the domain type and this row shape.
// ---------------------------------------------------------------------------

export interface WearEventItemRow {
  id: string
  wear_event_id: string
  item_id: string
}

export const wearEventItemFromRow = (row: WearEventItemRow): WearEventItem => ({
  id: row.id,
  wearEventId: row.wear_event_id,
  itemId: row.item_id,
})

export const wearEventItemToRow = (item: WearEventItem): WearEventItemRow => ({
  id: item.id,
  wear_event_id: item.wearEventId,
  item_id: item.itemId,
})
