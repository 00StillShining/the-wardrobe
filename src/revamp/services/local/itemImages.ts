import type { ItemImageCreate, ItemImageRepository } from '../contracts'
import type { ItemImage } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

export class LocalItemImageRepository implements ItemImageRepository {
  private readonly collection: JsonCollection<ItemImage>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.collection = new JsonCollection<ItemImage>(kv, 'item-images')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async listForItem(itemId: string): Promise<ItemImage[]> {
    return this.collection
      .read()
      .filter((image) => image.itemId === itemId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async create(input: ItemImageCreate): Promise<ItemImage> {
    const now = this.now()
    const image: ItemImage = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      itemId: input.itemId,
      kind: input.kind,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      processingVersion: input.processingVersion ?? 1,
      status: input.status ?? 'ready',
      errorCode: input.errorCode ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const images = this.collection.read()
    images.push(image)
    this.collection.write(images)
    return image
  }

  async remove(id: string): Promise<void> {
    const images = this.collection.read()
    const remaining = images.filter((image) => image.id !== id)
    if (remaining.length === images.length) {
      throw new AppError('not-found', `Item image ${id} does not exist`)
    }
    this.collection.write(remaining)
  }
}
