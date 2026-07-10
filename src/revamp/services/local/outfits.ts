import type { OutfitCreate, OutfitItemInput, OutfitRepository, OutfitUpdate } from '../contracts'
import type { Outfit, OutfitItem } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

/** Mirrors UNIQUE (outfit_id, item_id): one row per garment per outfit. */
const assertUniqueItemIds = (outfitId: string, inputs: OutfitItemInput[]): void => {
  const seen = new Set<string>()
  for (const input of inputs) {
    if (seen.has(input.itemId)) {
      throw new AppError('conflict', `Outfit ${outfitId} lists item ${input.itemId} twice`)
    }
    seen.add(input.itemId)
  }
}

const applyPatch = (outfit: Outfit, patch: OutfitUpdate): Outfit => ({
  ...outfit,
  name: patch.name !== undefined ? patch.name : outfit.name,
  occasion: patch.occasion !== undefined ? patch.occasion : outfit.occasion,
  season: patch.season !== undefined ? patch.season : outfit.season,
  notes: patch.notes !== undefined ? patch.notes : outfit.notes,
  plannedFor: patch.plannedFor !== undefined ? patch.plannedFor : outfit.plannedFor,
  coverImagePath:
    patch.coverImagePath !== undefined ? patch.coverImagePath : outfit.coverImagePath,
})

export class LocalOutfitRepository implements OutfitRepository {
  private readonly outfits: JsonCollection<Outfit>
  private readonly items: JsonCollection<OutfitItem>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.outfits = new JsonCollection<Outfit>(kv, 'outfits')
    this.items = new JsonCollection<OutfitItem>(kv, 'outfit-items')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async list(): Promise<Outfit[]> {
    return this.outfits
      .read()
      .filter((outfit) => outfit.deletedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async get(id: string): Promise<Outfit | null> {
    const outfit = this.outfits.read().find((entry) => entry.id === id)
    return outfit !== undefined && outfit.deletedAt === null ? outfit : null
  }

  async create(input: OutfitCreate, items: OutfitItemInput[] = []): Promise<Outfit> {
    const now = this.now()
    const outfit: Outfit = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      name: input.name,
      occasion: input.occasion ?? null,
      season: input.season ?? null,
      notes: input.notes ?? null,
      plannedFor: input.plannedFor ?? null,
      coverImagePath: input.coverImagePath ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    assertUniqueItemIds(outfit.id, items)
    const outfits = this.outfits.read()
    outfits.push(outfit)
    this.outfits.write(outfits)
    if (items.length > 0) this.replaceItems(outfit.id, items)
    return outfit
  }

  async update(id: string, patch: OutfitUpdate): Promise<Outfit> {
    const outfits = this.outfits.read()
    const index = outfits.findIndex((entry) => entry.id === id && entry.deletedAt === null)
    if (index === -1) throw new AppError('not-found', `Outfit ${id} does not exist`)

    const next: Outfit = { ...applyPatch(outfits[index], patch), updatedAt: this.now() }
    outfits[index] = next
    this.outfits.write(outfits)
    return next
  }

  async duplicate(id: string): Promise<Outfit> {
    const source = await this.get(id)
    if (source === null) throw new AppError('not-found', `Outfit ${id} does not exist`)
    const items = await this.listItems(id)

    const now = this.now()
    const copy: Outfit = {
      ...source,
      id: this.newId(),
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    }
    const outfits = this.outfits.read()
    outfits.push(copy)
    this.outfits.write(outfits)
    if (items.length > 0) {
      this.replaceItems(
        copy.id,
        items.map((item) => ({
          itemId: item.itemId,
          layerSlot: item.layerSlot,
          sortOrder: item.sortOrder,
          positionX: item.positionX,
          positionY: item.positionY,
          scale: item.scale,
          rotation: item.rotation,
        })),
      )
    }
    return copy
  }

  async softDelete(id: string): Promise<void> {
    const outfits = this.outfits.read()
    const index = outfits.findIndex((entry) => entry.id === id)
    if (index === -1) throw new AppError('not-found', `Outfit ${id} does not exist`)
    if (outfits[index].deletedAt !== null) return // idempotent
    outfits[index] = { ...outfits[index], deletedAt: this.now(), updatedAt: this.now() }
    this.outfits.write(outfits)
  }

  async listItems(outfitId: string): Promise<OutfitItem[]> {
    return this.items
      .read()
      .filter((item) => item.outfitId === outfitId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async setItems(outfitId: string, items: OutfitItemInput[]): Promise<OutfitItem[]> {
    const outfit = await this.get(outfitId)
    if (outfit === null) throw new AppError('not-found', `Outfit ${outfitId} does not exist`)
    assertUniqueItemIds(outfitId, items)
    return this.replaceItems(outfitId, items)
  }

  /** Swap the outfit's whole item set; caller has validated the inputs. */
  private replaceItems(outfitId: string, inputs: OutfitItemInput[]): OutfitItem[] {
    const created = inputs.map(
      (input): OutfitItem => ({
        id: this.newId(),
        outfitId,
        itemId: input.itemId,
        layerSlot: input.layerSlot,
        sortOrder: input.sortOrder ?? 0,
        positionX: input.positionX ?? null,
        positionY: input.positionY ?? null,
        scale: input.scale ?? null,
        rotation: input.rotation ?? null,
      }),
    )
    const others = this.items.read().filter((item) => item.outfitId !== outfitId)
    this.items.write([...others, ...created])
    return created
  }
}
