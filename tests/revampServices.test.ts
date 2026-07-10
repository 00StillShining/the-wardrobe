import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveBackendMode,
  deriveProductionMisconfigured,
} from '../src/revamp/config/env'
import {
  importJobFromRow,
  importJobToRow,
  itemImageFromRow,
  itemImageToRow,
  profileFromRow,
  profileToRow,
  wardrobeItemFromRow,
  wardrobeItemToRow,
} from '../src/revamp/data/rows'
import type { ImportJob, ItemImage, Profile, WardrobeItem } from '../src/revamp/data/types'
import { createBackend, isAppError } from '../src/revamp/services'
import type { Backend } from '../src/revamp/services'
import type { BlobStore, KeyValueStore } from '../src/revamp/services/local'

// ---------------------------------------------------------------------------
// In-memory seams (no DOM under node --test)
// ---------------------------------------------------------------------------

const memoryKv = (): KeyValueStore => {
  const data = new Map<string, string>()
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value)
    },
    remove: (key) => {
      data.delete(key)
    },
  }
}

const memoryBlobs = (): BlobStore => {
  const data = new Map<string, Blob>()
  return {
    put: async (key, blob) => {
      data.set(key, blob)
    },
    get: async (key) => data.get(key),
    delete: async (key) => {
      data.delete(key)
    },
  }
}

/** Deterministic monotonic clock + id sequence. */
const makeClock = () => {
  let tick = 0
  let id = 0
  return {
    now: () => new Date(Date.UTC(2026, 0, 1, 12, 0, 0) + tick++ * 1000).toISOString(),
    newId: () => `id-${String(++id).padStart(3, '0')}`,
  }
}

const makeBackend = (): Backend =>
  createBackend('local', { kv: memoryKv(), blobs: memoryBlobs(), ...makeClock() })

const rejectsWithCode = async (promise: Promise<unknown>, code: string, label: string) => {
  try {
    await promise
    assert.fail(`${label}: expected rejection with AppError '${code}'`)
  } catch (error) {
    assert.ok(isAppError(error), `${label}: expected AppError, got ${String(error)}`)
    assert.equal(error.code, code, `${label}: expected code '${code}', got '${error.code}'`)
  }
}

// ---------------------------------------------------------------------------
// env mode derivation
// ---------------------------------------------------------------------------

test('backend mode derives supabase only when both settings are present', () => {
  const url = 'https://project.supabase.co'
  const key = 'anon-key'
  assert.equal(deriveBackendMode({ supabaseUrl: url, supabaseAnonKey: key }), 'supabase')
  assert.equal(deriveBackendMode({ supabaseUrl: url, supabaseAnonKey: null }), 'local')
  assert.equal(deriveBackendMode({ supabaseUrl: null, supabaseAnonKey: key }), 'local')
  assert.equal(deriveBackendMode({ supabaseUrl: null, supabaseAnonKey: null }), 'local')
})

test('production without a backend is flagged as misconfigured, dev is not', () => {
  const missing = { supabaseUrl: null, supabaseAnonKey: null }
  const present = { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' }
  assert.equal(deriveProductionMisconfigured(missing, true), true)
  assert.equal(deriveProductionMisconfigured(missing, false), false)
  assert.equal(deriveProductionMisconfigured(present, true), false)
})

// ---------------------------------------------------------------------------
// row <-> domain mapper round-trips
// ---------------------------------------------------------------------------

test('wardrobe item mapper round-trips without loss', () => {
  const item: WardrobeItem = {
    id: 'a2c3e4f5-0000-0000-0000-000000000001',
    userId: 'user-1',
    name: 'Wool Overcoat',
    brand: 'Maison Test',
    category: 'outerwear',
    subcategory: 'coats',
    layerType: 'coat',
    ownershipStatus: 'owned',
    size: 'M',
    primaryColor: '#4a3f35',
    palette: ['#4a3f35', '#8b6f47'],
    seasons: ['autumn', 'winter'],
    occasions: ['work'],
    materialNotes: '80% wool',
    notes: 'Hem taken up 2cm',
    pricePaid: 320.5,
    currency: 'GBP',
    purchasedAt: '2025-11-02',
    merchant: 'Test Store',
    productUrl: 'https://example.com/coat',
    sourceType: 'manual',
    lastWornAt: '2026-01-04T09:00:00.000Z',
    wearCount: 7,
    processingStatus: 'ready',
    version: 3,
    createdAt: '2025-11-02T10:00:00.000Z',
    updatedAt: '2026-01-04T09:00:00.000Z',
    deletedAt: null,
  }
  assert.deepEqual(wardrobeItemFromRow(wardrobeItemToRow(item)), item)
})

test('import job, item image and profile mappers round-trip without loss', () => {
  const job: ImportJob = {
    id: 'job-1',
    userId: 'user-1',
    sourceType: 'camera',
    status: 'review',
    progress: 80,
    originalPath: 'user-1/items/x/original.jpg',
    resultPayload: { cutoutPath: 'user-1/items/x/cutout.png' },
    resultSchemaVersion: 1,
    errorCode: null,
    errorMessageKey: null,
    idempotencyKey: 'import-x',
    expiresAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:05:00.000Z',
  }
  assert.deepEqual(importJobFromRow(importJobToRow(job)), job)

  const image: ItemImage = {
    id: 'img-1',
    userId: 'user-1',
    itemId: 'item-1',
    kind: 'cutout',
    storagePath: 'user-1/items/item-1/cutout.png',
    mimeType: 'image/png',
    width: 1200,
    height: 1600,
    bytes: 245000,
    processingVersion: 2,
    status: 'ready',
    errorCode: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.deepEqual(itemImageFromRow(itemImageToRow(image)), image)

  const profile: Profile = {
    id: 'user-1',
    displayName: 'Alex',
    avatarPath: null,
    defaultCurrency: 'GBP',
    locale: 'en-GB',
    reducedMotion: true,
    qualityPreference: 'high',
    defaultCollectionView: 'grid',
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.deepEqual(profileFromRow(profileToRow(profile)), profile)
})

// ---------------------------------------------------------------------------
// local WardrobeRepository — CRUD
// ---------------------------------------------------------------------------

test('local wardrobe repository CRUD lifecycle', async () => {
  const backend = makeBackend()
  const repo = backend.wardrobe

  const created = await repo.create({
    name: 'Linen Shirt',
    category: 'tops',
    layerType: 'shirt',
    brand: 'Atelier',
    seasons: ['summer'],
  })
  assert.equal(created.version, 1)
  assert.equal(created.ownershipStatus, 'owned')
  assert.equal(created.userId, 'local-user')
  assert.equal(created.deletedAt, null)

  const fetched = await repo.get(created.id)
  assert.deepEqual(fetched, created)

  const updated = await repo.update(created.id, { notes: 'Press before wearing' }, 1)
  assert.equal(updated.version, 2)
  assert.equal(updated.notes, 'Press before wearing')
  assert.equal(updated.name, 'Linen Shirt')

  const archived = await repo.archive(created.id)
  assert.equal(archived.ownershipStatus, 'archived')
  assert.equal(archived.version, 3)

  await repo.softDelete(created.id)
  assert.equal(await repo.get(created.id), null)
  assert.deepEqual(await repo.list(), [])
  // Idempotent: deleting again is a no-op, not an error.
  await repo.softDelete(created.id)

  assert.equal(await repo.get('missing'), null)
  await rejectsWithCode(repo.update('missing', {}, 1), 'not-found', 'update missing')
  await rejectsWithCode(repo.archive('missing'), 'not-found', 'archive missing')
  await rejectsWithCode(repo.softDelete('missing'), 'not-found', 'delete missing')
})

test('stale update is rejected with a version conflict', async () => {
  const backend = makeBackend()
  const repo = backend.wardrobe
  const item = await repo.create({ name: 'Denim Jacket', category: 'outerwear', layerType: 'jacket' })

  await repo.update(item.id, { brand: 'Blue & Co' }, 1)
  // Second writer still holds version 1 -> must NOT win.
  await rejectsWithCode(repo.update(item.id, { brand: 'Rival' }, 1), 'conflict', 'stale update')

  const current = await repo.get(item.id)
  assert.equal(current?.brand, 'Blue & Co')
  assert.equal(current?.version, 2)
})

// ---------------------------------------------------------------------------
// local WardrobeRepository — search / filter / sort
// ---------------------------------------------------------------------------

test('local wardrobe list supports search, filters and sorts', async () => {
  const backend = makeBackend()
  const repo = backend.wardrobe

  const coat = await repo.create({
    name: 'Wool Coat',
    brand: 'North Atelier',
    category: 'outerwear',
    layerType: 'coat',
    seasons: ['winter'],
    occasions: ['work'],
  })
  const shirt = await repo.create({
    name: 'Linen Shirt',
    brand: 'Coastline',
    category: 'tops',
    layerType: 'shirt',
    seasons: ['summer'],
    occasions: ['casual'],
  })
  const wished = await repo.create({
    name: 'Silk Scarf',
    brand: 'Atelier Nine',
    category: 'accessories',
    layerType: 'accessory',
    ownershipStatus: 'wishlist',
    seasons: ['spring', 'winter'],
    occasions: ['evening'],
  })
  await repo.update(shirt.id, { lastWornAt: '2026-06-20T08:00:00.000Z', wearCount: 12 }, 1)
  await repo.update(coat.id, { lastWornAt: '2026-01-15T08:00:00.000Z', wearCount: 4 }, 1)

  // search matches name OR brand, case-insensitively (default sort: newest)
  assert.deepEqual(
    (await repo.list({ search: 'atelier' })).map((i) => i.id),
    [wished.id, coat.id],
  )
  // category filter
  assert.deepEqual((await repo.list({ category: 'tops' })).map((i) => i.id), [shirt.id])
  // ownership filter
  assert.deepEqual(
    (await repo.list({ ownershipStatus: 'wishlist' })).map((i) => i.id),
    [wished.id],
  )
  // season tag filter
  assert.deepEqual(
    (await repo.list({ season: 'winter', sort: 'name' })).map((i) => i.name),
    ['Silk Scarf', 'Wool Coat'],
  )
  // occasion tag filter
  assert.deepEqual((await repo.list({ occasion: 'work' })).map((i) => i.id), [coat.id])

  // sorts
  assert.deepEqual(
    (await repo.list({ sort: 'newest' })).map((i) => i.name),
    ['Silk Scarf', 'Linen Shirt', 'Wool Coat'],
  )
  assert.deepEqual(
    (await repo.list({ sort: 'name' })).map((i) => i.name),
    ['Linen Shirt', 'Silk Scarf', 'Wool Coat'],
  )
  // lastWorn: most recent first, never-worn last
  assert.deepEqual(
    (await repo.list({ sort: 'lastWorn' })).map((i) => i.name),
    ['Linen Shirt', 'Wool Coat', 'Silk Scarf'],
  )
  assert.deepEqual(
    (await repo.list({ sort: 'mostWorn' })).map((i) => i.name),
    ['Linen Shirt', 'Wool Coat', 'Silk Scarf'],
  )
})

// ---------------------------------------------------------------------------
// local ImportJobRepository — idempotency and lifecycle
// ---------------------------------------------------------------------------

test('import job creation is idempotent per key', async () => {
  const backend = makeBackend()
  const jobs = backend.importJobs

  const first = await jobs.createIdempotent({ idempotencyKey: 'import-1', sourceType: 'camera' })
  const retry = await jobs.createIdempotent({ idempotencyKey: 'import-1', sourceType: 'camera' })
  assert.equal(retry.id, first.id, 'same key must return the same job')

  const other = await jobs.createIdempotent({ idempotencyKey: 'import-2' })
  assert.notEqual(other.id, first.id, 'different key must create a new job')

  assert.equal(first.status, 'created')
  assert.equal(first.progress, 0)
})

test('import job status updates and active listing', async () => {
  const backend = makeBackend()
  const jobs = backend.importJobs

  const a = await jobs.createIdempotent({ idempotencyKey: 'a' })
  const b = await jobs.createIdempotent({ idempotencyKey: 'b' })

  await jobs.updateStatus(a.id, { status: 'processing', progress: 40 })
  const done = await jobs.updateStatus(b.id, { status: 'complete', progress: 100 })
  assert.equal(done.status, 'complete')

  const active = await jobs.listActive()
  assert.deepEqual(active.map((job) => job.id), [a.id], 'complete jobs are not active')

  const fetched = await jobs.get(a.id)
  assert.equal(fetched?.progress, 40)
  assert.equal(await jobs.get('missing'), null)
  await rejectsWithCode(jobs.updateStatus('missing', { progress: 1 }), 'not-found', 'update missing job')
})

// ---------------------------------------------------------------------------
// local MediaService — path convention and blob seam
// ---------------------------------------------------------------------------

test('local media service enforces the user-prefixed path convention', async () => {
  const backend = makeBackend()
  const media = backend.media

  const blob = new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' })
  const path = await media.upload({ bucket: 'originals', key: 'items/x/original.jpg', blob })
  assert.equal(path, 'local-user/items/x/original.jpg')

  // plain upload refuses to overwrite; upsert allows it
  await rejectsWithCode(
    media.upload({ bucket: 'originals', key: 'items/x/original.jpg', blob }),
    'conflict',
    'duplicate upload',
  )
  await media.upload({ bucket: 'originals', key: 'items/x/original.jpg', blob, upsert: true })

  // traversal and absolute keys are rejected
  await rejectsWithCode(
    media.upload({ bucket: 'originals', key: '../escape.jpg', blob }),
    'validation',
    'traversal key',
  )
  // foreign paths are rejected before touching storage
  await rejectsWithCode(
    media.getObjectUrl('originals', 'other-user/items/x/original.jpg'),
    'validation',
    'foreign path',
  )

  await media.delete('originals', path)
  await rejectsWithCode(media.getObjectUrl('originals', path), 'not-found', 'deleted object')
})

// ---------------------------------------------------------------------------
// local auth — deterministic single user
// ---------------------------------------------------------------------------

test('local auth resolves an immediate deterministic session', async () => {
  const backend = makeBackend()
  const auth = backend.auth

  assert.equal(await auth.getSession(), null)
  const seen: Array<string | null> = []
  const unsubscribe = auth.onAuthStateChange((session) => seen.push(session?.userId ?? null))

  const result = await auth.signInWithEmail('me@example.com')
  assert.equal(result.kind, 'session')
  assert.equal(await auth.currentUserId(), 'local-user')

  await auth.signOut()
  assert.equal(await auth.getSession(), null)
  unsubscribe()
  assert.deepEqual(seen, ['local-user', null])
})
