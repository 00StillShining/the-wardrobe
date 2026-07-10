import test from 'node:test'
import assert from 'node:assert/strict'
import {
  boardElementFromRow,
  boardElementToRow,
  outfitFromRow,
  outfitItemFromRow,
  outfitItemToRow,
  outfitToRow,
  styleBoardFromRow,
  styleBoardToRow,
  wearEventFromRow,
  wearEventItemFromRow,
  wearEventItemToRow,
  wearEventToRow,
} from '../src/revamp/data/rows'
import type {
  BoardElement,
  Outfit,
  OutfitItem,
  StyleBoard,
  WardrobeItem,
  WearEvent,
  WearEventItem,
} from '../src/revamp/data/types'
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

const makeItem = (backend: Backend, name: string): Promise<WardrobeItem> =>
  backend.wardrobe.create({ name, category: 'tops', layerType: 'shirt' })

// ---------------------------------------------------------------------------
// row <-> domain mapper round-trips
// ---------------------------------------------------------------------------

test('outfit and outfit item mappers round-trip without loss', () => {
  const outfit: Outfit = {
    id: 'outfit-1',
    userId: 'user-1',
    name: 'Gallery Opening',
    occasion: 'evening',
    season: 'autumn',
    notes: 'Steam the blazer first',
    plannedFor: '2026-02-14',
    coverImagePath: 'user-1/outfits/outfit-1/cover.webp',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
  }
  assert.deepEqual(outfitFromRow(outfitToRow(outfit)), outfit)

  const item: OutfitItem = {
    id: 'oi-1',
    outfitId: 'outfit-1',
    itemId: 'item-1',
    layerSlot: 'top',
    sortOrder: 2,
    positionX: 0.25,
    positionY: 0.75,
    scale: 1.1,
    rotation: -6,
  }
  assert.deepEqual(outfitItemFromRow(outfitItemToRow(item)), item)
})

test('style board and board element mappers round-trip without loss', () => {
  const board: StyleBoard = {
    id: 'board-1',
    userId: 'user-1',
    title: 'Winter Capsule',
    documentVersion: 4,
    canvasWidth: 1920,
    canvasHeight: 1080,
    coverImagePath: null,
    exportImagePath: 'user-1/boards/board-1/export.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    deletedAt: null,
  }
  assert.deepEqual(styleBoardFromRow(styleBoardToRow(board)), board)

  const element: BoardElement = {
    id: 'el-1',
    boardId: 'board-1',
    userId: 'user-1',
    kind: 'caption',
    positionX: 0.5,
    positionY: 0.1,
    scale: 1,
    rotation: 0,
    zIndex: 3,
    locked: true,
    hidden: false,
    itemId: null,
    mediaPath: null,
    style: { text: 'Layer wool over silk', fontSize: 18 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.deepEqual(boardElementFromRow(boardElementToRow(element)), element)
})

test('wear event and wear event item mappers round-trip without loss', () => {
  const event: WearEvent = {
    id: 'wear-1',
    userId: 'user-1',
    wornAt: '2026-01-05T08:30:00.000Z',
    outfitId: 'outfit-1',
    notes: 'Rained all day',
    createdAt: '2026-01-05T20:00:00.000Z',
    updatedAt: '2026-01-05T20:00:00.000Z',
  }
  assert.deepEqual(wearEventFromRow(wearEventToRow(event)), event)

  const join: WearEventItem = { id: 'wei-1', wearEventId: 'wear-1', itemId: 'item-1' }
  assert.deepEqual(wearEventItemFromRow(wearEventItemToRow(join)), join)
})

// ---------------------------------------------------------------------------
// local OutfitRepository — create-with-items, setItems, duplicate
// ---------------------------------------------------------------------------

test('outfit create-with-items round-trips through get and listItems', async () => {
  const backend = makeBackend()
  const shirt = await makeItem(backend, 'Linen Shirt')
  const coat = await makeItem(backend, 'Wool Coat')

  const outfit = await backend.outfits.create(
    { name: 'First Frost', occasion: 'work', season: 'winter' },
    [
      { itemId: coat.id, layerSlot: 'outer', sortOrder: 1 },
      { itemId: shirt.id, layerSlot: 'top', sortOrder: 0, positionX: 0.4, scale: 1.2 },
    ],
  )
  assert.equal(outfit.userId, 'local-user')
  assert.equal(outfit.notes, null)
  assert.equal(outfit.deletedAt, null)
  assert.deepEqual(await backend.outfits.get(outfit.id), outfit)

  const items = await backend.outfits.listItems(outfit.id)
  assert.deepEqual(items.map((i) => [i.itemId, i.layerSlot, i.sortOrder]), [
    [shirt.id, 'top', 0],
    [coat.id, 'outer', 1],
  ])
  assert.equal(items[0].positionX, 0.4)
  assert.equal(items[0].scale, 1.2)
  assert.equal(items[0].positionY, null)
  assert.equal(items[1].positionX, null)
  assert.equal(items[1].rotation, null)
  assert.ok(items.every((i) => i.outfitId === outfit.id))
})

test('outfit setItems replaces the whole set and validates honestly', async () => {
  const backend = makeBackend()
  const shirt = await makeItem(backend, 'Linen Shirt')
  const coat = await makeItem(backend, 'Wool Coat')
  const scarf = await makeItem(backend, 'Silk Scarf')

  const outfit = await backend.outfits.create({ name: 'Draft' }, [
    { itemId: shirt.id, layerSlot: 'top' },
  ])

  const replaced = await backend.outfits.setItems(outfit.id, [
    { itemId: coat.id, layerSlot: 'outer', sortOrder: 0 },
    { itemId: scarf.id, layerSlot: 'accessory', sortOrder: 1 },
  ])
  assert.deepEqual(replaced.map((i) => i.itemId), [coat.id, scarf.id])
  assert.deepEqual(
    (await backend.outfits.listItems(outfit.id)).map((i) => i.itemId),
    [coat.id, scarf.id],
    'the old item set is gone',
  )

  await backend.outfits.setItems(outfit.id, [])
  assert.deepEqual(await backend.outfits.listItems(outfit.id), [])

  // Mirrors UNIQUE (outfit_id, item_id).
  await rejectsWithCode(
    backend.outfits.setItems(outfit.id, [
      { itemId: coat.id, layerSlot: 'outer' },
      { itemId: coat.id, layerSlot: 'top' },
    ]),
    'conflict',
    'duplicate item in one outfit',
  )
  await rejectsWithCode(
    backend.outfits.setItems('missing', [{ itemId: coat.id, layerSlot: 'outer' }]),
    'not-found',
    'setItems on missing outfit',
  )
})

test('outfit duplicate copies fields and items into a new outfit', async () => {
  const backend = makeBackend()
  const shirt = await makeItem(backend, 'Linen Shirt')
  const coat = await makeItem(backend, 'Wool Coat')

  const original = await backend.outfits.create(
    { name: 'First Frost', occasion: 'work', notes: 'Belt optional', plannedFor: '2026-02-01' },
    [
      { itemId: shirt.id, layerSlot: 'top', sortOrder: 0, positionX: 0.4 },
      { itemId: coat.id, layerSlot: 'outer', sortOrder: 1, rotation: 3 },
    ],
  )

  const copy = await backend.outfits.duplicate(original.id)
  assert.notEqual(copy.id, original.id)
  assert.equal(copy.name, 'First Frost (copy)')
  assert.equal(copy.occasion, 'work')
  assert.equal(copy.notes, 'Belt optional')
  assert.equal(copy.plannedFor, '2026-02-01')

  const originalItems = await backend.outfits.listItems(original.id)
  const copyItems = await backend.outfits.listItems(copy.id)
  assert.equal(copyItems.length, 2)
  assert.ok(copyItems.every((item) => item.outfitId === copy.id))
  assert.ok(
    copyItems.every((item) => !originalItems.some((o) => o.id === item.id)),
    'copied items are new rows',
  )
  assert.deepEqual(
    copyItems.map((i) => [i.itemId, i.layerSlot, i.sortOrder, i.positionX, i.rotation]),
    originalItems.map((i) => [i.itemId, i.layerSlot, i.sortOrder, i.positionX, i.rotation]),
  )

  // Both live independently now.
  await backend.outfits.softDelete(original.id)
  assert.equal(await backend.outfits.get(original.id), null)
  assert.deepEqual((await backend.outfits.list()).map((o) => o.id), [copy.id])
  assert.deepEqual((await backend.outfits.listItems(copy.id)).length, 2)

  await rejectsWithCode(backend.outfits.duplicate('missing'), 'not-found', 'duplicate missing')
})

test('outfit update patches fields and softDelete is idempotent', async () => {
  const backend = makeBackend()
  const outfit = await backend.outfits.create({ name: 'Draft' })

  const updated = await backend.outfits.update(outfit.id, {
    name: 'Evening Draft',
    season: 'summer',
    coverImagePath: 'local-user/outfits/x/cover.webp',
  })
  assert.equal(updated.name, 'Evening Draft')
  assert.equal(updated.season, 'summer')
  assert.equal(updated.coverImagePath, 'local-user/outfits/x/cover.webp')
  assert.ok(updated.updatedAt > outfit.updatedAt)

  await backend.outfits.softDelete(outfit.id)
  await backend.outfits.softDelete(outfit.id) // idempotent
  await rejectsWithCode(backend.outfits.update(outfit.id, { name: 'x' }), 'not-found', 'update deleted')
  await rejectsWithCode(backend.outfits.softDelete('missing'), 'not-found', 'delete missing')
})

// ---------------------------------------------------------------------------
// local StyleBoardRepository — documentVersion behaviour
// ---------------------------------------------------------------------------

test('style board create + saveElements + documentVersion behaviour', async () => {
  const backend = makeBackend()
  const item = await makeItem(backend, 'Linen Shirt')

  const board = await backend.styleBoards.create({
    title: 'Winter Capsule',
    canvasWidth: 1600,
    canvasHeight: 900,
  })
  assert.equal(board.documentVersion, 1)
  assert.equal(board.coverImagePath, null)
  assert.equal(board.exportImagePath, null)

  // Metadata-only update: no bump.
  const retitled = await backend.styleBoards.update(board.id, {
    title: 'Deep Winter Capsule',
    coverImagePath: 'local-user/boards/x/cover.webp',
  })
  assert.equal(retitled.documentVersion, 1)
  assert.equal(retitled.title, 'Deep Winter Capsule')

  // Canvas geometry is part of the document: bump.
  const resized = await backend.styleBoards.update(board.id, { canvasWidth: 1920 })
  assert.equal(resized.documentVersion, 2)
  assert.equal(resized.canvasWidth, 1920)
  assert.equal(resized.canvasHeight, 900)

  // Same canvas values again: no bump.
  const unchanged = await backend.styleBoards.update(board.id, { canvasWidth: 1920 })
  assert.equal(unchanged.documentVersion, 2)

  // Every saved element set is a new document revision.
  const saved = await backend.styleBoards.saveElements(board.id, [
    {
      kind: 'item',
      positionX: 0.3,
      positionY: 0.4,
      scale: 1,
      rotation: 0,
      zIndex: 1,
      locked: false,
      hidden: false,
      itemId: item.id,
    },
    {
      kind: 'caption',
      positionX: 0.5,
      positionY: 0.9,
      scale: 1,
      rotation: 0,
      zIndex: 2,
      locked: false,
      hidden: false,
      style: { text: 'Wool first' },
    },
  ])
  assert.equal(saved.length, 2)
  assert.equal(saved[0].itemId, item.id)
  assert.equal(saved[0].mediaPath, null)
  assert.deepEqual(saved[1].style, { text: 'Wool first' })
  assert.equal((await backend.styleBoards.get(board.id))?.documentVersion, 3)

  // Re-save keeps element identity when ids are passed, drops the rest.
  const kept = saved[0]
  const resaved = await backend.styleBoards.saveElements(board.id, [
    {
      id: kept.id,
      kind: kept.kind,
      positionX: 0.35,
      positionY: kept.positionY,
      scale: kept.scale,
      rotation: kept.rotation,
      zIndex: kept.zIndex,
      locked: kept.locked,
      hidden: kept.hidden,
      itemId: kept.itemId,
    },
  ])
  assert.deepEqual(resaved.map((e) => e.id), [kept.id])
  assert.equal(resaved[0].positionX, 0.35)
  const listed = await backend.styleBoards.listElements(board.id)
  assert.deepEqual(listed.map((e) => e.id), [kept.id], 'the caption element is gone')
  assert.equal((await backend.styleBoards.get(board.id))?.documentVersion, 4)

  await rejectsWithCode(
    backend.styleBoards.saveElements('missing', []),
    'not-found',
    'saveElements on missing board',
  )
  await rejectsWithCode(
    backend.styleBoards.saveElements(board.id, [
      {
        id: kept.id,
        kind: 'item',
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        zIndex: 0,
        locked: false,
        hidden: false,
      },
      {
        id: kept.id,
        kind: 'item',
        positionX: 1,
        positionY: 1,
        scale: 1,
        rotation: 0,
        zIndex: 1,
        locked: false,
        hidden: false,
      },
    ]),
    'conflict',
    'duplicate element id in one save',
  )

  await backend.styleBoards.softDelete(board.id)
  await backend.styleBoards.softDelete(board.id) // idempotent
  assert.equal(await backend.styleBoards.get(board.id), null)
  assert.deepEqual(await backend.styleBoards.list(), [])
})

test('style board elements list orders by zIndex', async () => {
  const backend = makeBackend()
  const board = await backend.styleBoards.create({ title: 'Order', canvasWidth: 100, canvasHeight: 100 })
  await backend.styleBoards.saveElements(board.id, [
    { kind: 'a', positionX: 0, positionY: 0, scale: 1, rotation: 0, zIndex: 5, locked: false, hidden: false },
    { kind: 'b', positionX: 0, positionY: 0, scale: 1, rotation: 0, zIndex: 1, locked: false, hidden: false },
    { kind: 'c', positionX: 0, positionY: 0, scale: 1, rotation: 0, zIndex: 3, locked: false, hidden: false },
  ])
  assert.deepEqual(
    (await backend.styleBoards.listElements(board.id)).map((e) => e.kind),
    ['b', 'c', 'a'],
  )
})

// ---------------------------------------------------------------------------
// local WearRepository — counters stay honest
// ---------------------------------------------------------------------------

test('logWear bumps wearCount/lastWornAt and removeEvent reverses honestly', async () => {
  const backend = makeBackend()
  const shirt = await makeItem(backend, 'Linen Shirt')
  const coat = await makeItem(backend, 'Wool Coat')

  const first = await backend.wear.logWear({
    wornAt: '2026-01-10T09:00:00.000Z',
    itemIds: [shirt.id, coat.id, shirt.id], // duplicate ids are deduplicated
    notes: 'Cold morning',
  })
  assert.equal(first.outfitId, null)
  assert.equal((await backend.wear.listEventItems(first.id)).length, 2)

  let shirtNow = await backend.wardrobe.get(shirt.id)
  assert.equal(shirtNow?.wearCount, 1, 'duplicate ids in one event count once')
  assert.equal(shirtNow?.lastWornAt, '2026-01-10T09:00:00.000Z')
  assert.equal((await backend.wardrobe.get(coat.id))?.wearCount, 1)

  // A later wear moves lastWornAt forward.
  const second = await backend.wear.logWear({
    wornAt: '2026-01-20T09:00:00.000Z',
    itemIds: [shirt.id],
  })
  shirtNow = await backend.wardrobe.get(shirt.id)
  assert.equal(shirtNow?.wearCount, 2)
  assert.equal(shirtNow?.lastWornAt, '2026-01-20T09:00:00.000Z')

  // A backdated wear must NOT move lastWornAt backwards.
  const backdated = await backend.wear.logWear({
    wornAt: '2026-01-05T09:00:00.000Z',
    itemIds: [shirt.id],
  })
  shirtNow = await backend.wardrobe.get(shirt.id)
  assert.equal(shirtNow?.wearCount, 3)
  assert.equal(shirtNow?.lastWornAt, '2026-01-20T09:00:00.000Z')

  // Removing the most recent event recomputes lastWornAt from what remains.
  await backend.wear.removeEvent(second.id)
  shirtNow = await backend.wardrobe.get(shirt.id)
  assert.equal(shirtNow?.wearCount, 2)
  assert.equal(shirtNow?.lastWornAt, '2026-01-10T09:00:00.000Z')

  // Removing the rest empties the history honestly.
  await backend.wear.removeEvent(first.id)
  await backend.wear.removeEvent(backdated.id)
  shirtNow = await backend.wardrobe.get(shirt.id)
  assert.equal(shirtNow?.wearCount, 0)
  assert.equal(shirtNow?.lastWornAt, null)
  const coatNow = await backend.wardrobe.get(coat.id)
  assert.equal(coatNow?.wearCount, 0)
  assert.equal(coatNow?.lastWornAt, null)
  assert.deepEqual(await backend.wear.listEvents(), [])
  assert.deepEqual(await backend.wear.listEventItems(first.id), [])

  await rejectsWithCode(backend.wear.removeEvent(first.id), 'not-found', 'remove twice')
  await rejectsWithCode(backend.wear.logWear({ itemIds: [] }), 'validation', 'empty itemIds')
  await rejectsWithCode(
    backend.wear.logWear({ itemIds: ['missing'] }),
    'validation',
    'unknown item id',
  )
})

test('wear listEvents range filter and listForItem', async () => {
  const backend = makeBackend()
  const shirt = await makeItem(backend, 'Linen Shirt')
  const coat = await makeItem(backend, 'Wool Coat')
  const outfit = await backend.outfits.create({ name: 'Commute' }, [
    { itemId: shirt.id, layerSlot: 'top' },
  ])

  const jan = await backend.wear.logWear({
    wornAt: '2026-01-15T08:00:00.000Z',
    itemIds: [shirt.id],
    outfitId: outfit.id,
  })
  const feb = await backend.wear.logWear({
    wornAt: '2026-02-15T08:00:00.000Z',
    itemIds: [shirt.id, coat.id],
  })
  const mar = await backend.wear.logWear({
    wornAt: '2026-03-15T08:00:00.000Z',
    itemIds: [coat.id],
  })
  assert.equal(jan.outfitId, outfit.id)

  // Newest first, inclusive range edges.
  assert.deepEqual((await backend.wear.listEvents()).map((e) => e.id), [mar.id, feb.id, jan.id])
  assert.deepEqual(
    (await backend.wear.listEvents({ from: '2026-02-01T00:00:00.000Z' })).map((e) => e.id),
    [mar.id, feb.id],
  )
  assert.deepEqual(
    (await backend.wear.listEvents({ to: '2026-02-15T08:00:00.000Z' })).map((e) => e.id),
    [feb.id, jan.id],
  )
  assert.deepEqual(
    (
      await backend.wear.listEvents({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-02-28T00:00:00.000Z',
      })
    ).map((e) => e.id),
    [feb.id],
  )

  assert.deepEqual((await backend.wear.listForItem(shirt.id)).map((e) => e.id), [feb.id, jan.id])
  assert.deepEqual((await backend.wear.listForItem(coat.id)).map((e) => e.id), [mar.id, feb.id])
  assert.deepEqual(await backend.wear.listForItem('missing'), [])

  // logWear without wornAt defaults to "now" (the injected clock).
  const defaulted = await backend.wear.logWear({ itemIds: [shirt.id] })
  assert.ok(defaulted.wornAt.startsWith('2026-01-01T12:'))
})
