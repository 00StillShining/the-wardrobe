import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  byWear,
  categoryDistribution,
  costPerWear,
  counts,
  incompleteItems,
  notWornSince,
  purchaseCadence,
  recordedValue,
} from '../src/revamp/features/insights/metrics'
import type { WardrobeItem } from '../src/revamp/data/types'

/** Documented fixture (plan §9.8 gate: every metric has a query + fixture). */
function fixture(): WardrobeItem[] {
  const base = {
    userId: 'u',
    brand: null,
    subcategory: null,
    size: null,
    palette: [],
    seasons: [],
    occasions: [],
    materialNotes: null,
    notes: null,
    merchant: null,
    productUrl: null,
    sourceType: 'manual',
    processingStatus: 'ready',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    currency: 'GBP',
    primaryColor: null,
    lastWornAt: null,
    wearCount: 0,
  }
  return [
    { ...base, id: 'coat', name: 'Coat', category: 'outerwear', layerType: 'coat', ownershipStatus: 'owned', pricePaid: 300, purchasedAt: '2026-05-10T00:00:00Z', wearCount: 10, lastWornAt: '2026-07-01T00:00:00Z', primaryColor: '#333333' },
    { ...base, id: 'tee', name: 'Tee', category: 'tops', layerType: 'tee', ownershipStatus: 'owned', pricePaid: 40, purchasedAt: '2026-06-02T00:00:00Z', wearCount: 2, lastWornAt: '2026-03-01T00:00:00Z', primaryColor: '#2e4636' },
    { ...base, id: 'jeans', name: 'Jeans', category: 'trousers', layerType: 'bottom', ownershipStatus: 'owned', pricePaid: null, purchasedAt: null, wearCount: 0 },
    { ...base, id: 'wish', name: 'Wish Dress', category: 'dresses', layerType: 'dress', ownershipStatus: 'wishlist', pricePaid: 180, purchasedAt: null },
    { ...base, id: 'arch', name: 'Old Scarf', category: 'accessories', layerType: 'accessory', ownershipStatus: 'archived', pricePaid: 25 },
  ] as WardrobeItem[]
}

test('counts exclude archived; wishlist separate', () => {
  assert.deepEqual(counts(fixture()), { owned: 3, wishlist: 1, total: 4 })
})

test('recordedValue is honest about missing prices', () => {
  const v = recordedValue(fixture())
  assert.equal(v.total, 340)
  assert.equal(v.pricedCount, 2)
  assert.equal(v.missingPriceCount, 1)
  const w = recordedValue(fixture(), 'wishlist')
  assert.equal(w.total, 180)
  assert.equal(w.missingPriceCount, 0)
})

test('categoryDistribution counts owned only, sorted', () => {
  const dist = categoryDistribution(fixture())
  assert.equal(dist.length, 3)
  assert.ok(dist.every((b) => b.count === 1))
})

test('byWear both directions', () => {
  assert.equal(byWear(fixture(), 'most')[0].id, 'coat')
  assert.equal(byWear(fixture(), 'least')[0].id, 'jeans')
})

test('notWornSince includes never-worn and stale items', () => {
  const stale = notWornSince(fixture(), '2026-06-01T00:00:00Z')
  assert.deepEqual(stale.map((i) => i.id).sort(), ['jeans', 'tee'])
})

test('costPerWear only where price AND wear exist', () => {
  const cpw = costPerWear(fixture())
  assert.equal(cpw.length, 2)
  assert.equal(cpw[0].item.id, 'tee') // 40/2 = 20 beats 300/10 = 30
  assert.equal(cpw[0].costPerWear, 20)
})

test('purchaseCadence buckets by month within the window', () => {
  const cad = purchaseCadence(fixture(), 3, '2026-07-10T00:00:00Z')
  assert.deepEqual(cad.map((b) => b.month), ['2026-05', '2026-06', '2026-07'])
  assert.deepEqual(cad.map((b) => b.count), [1, 1, 0])
})

test('incompleteItems flags missing price or purchase date', () => {
  assert.deepEqual(incompleteItems(fixture()).map((i) => i.id), ['jeans'])
})
