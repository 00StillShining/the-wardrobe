import type {
  WardrobeItemCreate,
  WardrobeItemUpdate,
  WardrobeListParams,
  WardrobeRepository,
} from '../contracts'
import type { WardrobeItem } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

const matchesSearch = (item: WardrobeItem, term: string): boolean => {
  const lower = term.toLowerCase()
  return item.name.toLowerCase().includes(lower) || item.brand.toLowerCase().includes(lower)
}

/** lastWornAt desc, never-worn last — mirrors the Supabase nullsFirst:false order. */
const byLastWorn = (a: WardrobeItem, b: WardrobeItem): number => {
  if (a.lastWornAt === null && b.lastWornAt === null) return 0
  if (a.lastWornAt === null) return 1
  if (b.lastWornAt === null) return -1
  return b.lastWornAt.localeCompare(a.lastWornAt)
}

const applyPatch = (item: WardrobeItem, patch: WardrobeItemUpdate): WardrobeItem => ({
  ...item,
  name: patch.name !== undefined ? patch.name : item.name,
  brand: patch.brand !== undefined ? patch.brand : item.brand,
  category: patch.category !== undefined ? patch.category : item.category,
  subcategory: patch.subcategory !== undefined ? patch.subcategory : item.subcategory,
  layerType: patch.layerType !== undefined ? patch.layerType : item.layerType,
  ownershipStatus:
    patch.ownershipStatus !== undefined ? patch.ownershipStatus : item.ownershipStatus,
  size: patch.size !== undefined ? patch.size : item.size,
  primaryColor: patch.primaryColor !== undefined ? patch.primaryColor : item.primaryColor,
  palette: patch.palette !== undefined ? [...patch.palette] : item.palette,
  seasons: patch.seasons !== undefined ? [...patch.seasons] : item.seasons,
  occasions: patch.occasions !== undefined ? [...patch.occasions] : item.occasions,
  materialNotes: patch.materialNotes !== undefined ? patch.materialNotes : item.materialNotes,
  notes: patch.notes !== undefined ? patch.notes : item.notes,
  pricePaid: patch.pricePaid !== undefined ? patch.pricePaid : item.pricePaid,
  currency: patch.currency !== undefined ? patch.currency : item.currency,
  purchasedAt: patch.purchasedAt !== undefined ? patch.purchasedAt : item.purchasedAt,
  merchant: patch.merchant !== undefined ? patch.merchant : item.merchant,
  productUrl: patch.productUrl !== undefined ? patch.productUrl : item.productUrl,
  sourceType: patch.sourceType !== undefined ? patch.sourceType : item.sourceType,
  processingStatus:
    patch.processingStatus !== undefined ? patch.processingStatus : item.processingStatus,
  lastWornAt: patch.lastWornAt !== undefined ? patch.lastWornAt : item.lastWornAt,
  wearCount: patch.wearCount !== undefined ? patch.wearCount : item.wearCount,
})

export class LocalWardrobeRepository implements WardrobeRepository {
  private readonly collection: JsonCollection<WardrobeItem>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.collection = new JsonCollection<WardrobeItem>(kv, 'wardrobe-items')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async list(params: WardrobeListParams = {}): Promise<WardrobeItem[]> {
    let items = this.collection.read().filter((item) => item.deletedAt === null)

    if (params.category !== undefined) {
      items = items.filter((item) => item.category === params.category)
    }
    if (params.ownershipStatus !== undefined) {
      items = items.filter((item) => item.ownershipStatus === params.ownershipStatus)
    }
    const { season, occasion } = params
    if (season !== undefined) {
      items = items.filter((item) => item.seasons.includes(season))
    }
    if (occasion !== undefined) {
      items = items.filter((item) => item.occasions.includes(occasion))
    }
    if (params.search !== undefined && params.search.trim().length > 0) {
      const term = params.search.trim()
      items = items.filter((item) => matchesSearch(item, term))
    }

    switch (params.sort ?? 'newest') {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'lastWorn':
        items.sort(byLastWorn)
        break
      case 'mostWorn':
        items.sort((a, b) => b.wearCount - a.wearCount)
        break
      case 'newest':
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        break
    }
    return items
  }

  async get(id: string): Promise<WardrobeItem | null> {
    const item = this.collection.read().find((entry) => entry.id === id)
    return item !== undefined && item.deletedAt === null ? item : null
  }

  async create(input: WardrobeItemCreate): Promise<WardrobeItem> {
    const now = this.now()
    const item: WardrobeItem = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      name: input.name,
      brand: input.brand ?? '',
      category: input.category,
      subcategory: input.subcategory ?? null,
      layerType: input.layerType,
      ownershipStatus: input.ownershipStatus ?? 'owned',
      size: input.size ?? null,
      primaryColor: input.primaryColor ?? null,
      palette: input.palette !== undefined ? [...input.palette] : [],
      seasons: input.seasons !== undefined ? [...input.seasons] : [],
      occasions: input.occasions !== undefined ? [...input.occasions] : [],
      materialNotes: input.materialNotes ?? null,
      notes: input.notes ?? null,
      pricePaid: input.pricePaid ?? null,
      currency: input.currency ?? 'GBP',
      purchasedAt: input.purchasedAt ?? null,
      merchant: input.merchant ?? null,
      productUrl: input.productUrl ?? null,
      sourceType: input.sourceType ?? 'manual',
      lastWornAt: null,
      wearCount: 0,
      processingStatus: 'none',
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    const items = this.collection.read()
    items.push(item)
    this.collection.write(items)
    return item
  }

  async update(
    id: string,
    patch: WardrobeItemUpdate,
    expectedVersion: number,
  ): Promise<WardrobeItem> {
    const items = this.collection.read()
    const index = items.findIndex((entry) => entry.id === id && entry.deletedAt === null)
    if (index === -1) throw new AppError('not-found', `Item ${id} does not exist`)

    const current = items[index]
    if (current.version !== expectedVersion) {
      throw new AppError(
        'conflict',
        `Item ${id} changed since it was read (expected version ${expectedVersion}, found ${current.version})`,
      )
    }

    const next: WardrobeItem = {
      ...applyPatch(current, patch),
      version: current.version + 1,
      updatedAt: this.now(),
    }
    items[index] = next
    this.collection.write(items)
    return next
  }

  async archive(id: string): Promise<WardrobeItem> {
    const current = await this.get(id)
    if (current === null) throw new AppError('not-found', `Item ${id} does not exist`)
    return this.update(id, { ownershipStatus: 'archived' }, current.version)
  }

  async softDelete(id: string): Promise<void> {
    const items = this.collection.read()
    const index = items.findIndex((entry) => entry.id === id)
    if (index === -1) throw new AppError('not-found', `Item ${id} does not exist`)
    if (items[index].deletedAt !== null) return // idempotent
    items[index] = { ...items[index], deletedAt: this.now(), updatedAt: this.now() }
    this.collection.write(items)
  }
}
