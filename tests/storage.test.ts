import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeStorage, STORAGE_SCHEMA_VERSION, type StorageAdapter } from '../src/adapters/storage/StorageAdapter'
import { isStoredSheets, isStoredWardrobeItems } from '../src/adapters/storage/validation'

function memoryStorage(initial: Record<string, unknown> = {}): StorageAdapter {
  const data = new Map(Object.entries(initial))
  return {
    readJSON: (key) => (data.get(key) as never) ?? null,
    writeJSON: (key, value) => data.set(key, value),
    putBlob: async () => undefined,
    getBlob: async () => undefined,
    delBlob: async () => undefined,
    listBlobKeys: async () => [],
    reset: async () => data.clear(),
  }
}

test('storage initialization stamps legacy storage and protects newer schemas', () => {
  const legacy = memoryStorage()
  assert.equal(initializeStorage(legacy), 'migrated')
  assert.equal(legacy.readJSON('schema-version'), STORAGE_SCHEMA_VERSION)

  const future = memoryStorage({ 'schema-version': STORAGE_SCHEMA_VERSION + 1 })
  assert.equal(initializeStorage(future), 'incompatible')
  assert.equal(future.readJSON('schema-version'), STORAGE_SCHEMA_VERSION + 1)
})

test('storage validation rejects malformed wardrobe items and sheets', () => {
  const item = {
    id: 'item-1',
    name: 'Wool Coat',
    brand: 'Test Brand',
    category: 'outerwear',
    template: 'coat',
    owned: true,
    images: { original: 'orig:item-1', cutout: 'cut:item-1' },
    palette: ['#333333'],
    currency: 'GBP',
    source: { addedAt: '2026-06-01' },
  }
  assert.equal(isStoredWardrobeItems([item]), true)
  assert.equal(isStoredWardrobeItems([{ ...item, category: 'costume' }]), false)

  const sheet = {
    id: 'sheet-1',
    title: 'Autumn',
    createdAt: '2026-06-01',
    elements: [{ id: 'caption-1', kind: 'caption', x: 0.5, y: 0.5, scale: 1, rotation: 0, z: 1, text: 'Autumn' }],
  }
  assert.equal(isStoredSheets([sheet]), true)
  assert.equal(isStoredSheets([{ ...sheet, elements: [{ ...sheet.elements[0], x: 'middle' }] }]), false)
})
