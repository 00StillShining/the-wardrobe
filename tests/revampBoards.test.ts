import { test } from 'node:test'
import assert from 'node:assert/strict'
import { autoLayout, BOARD_CANVAS } from '../src/revamp/features/style/boardModel'

const garments = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    itemId: `item-${i}`,
    layerType: ['tee', 'coat', 'bottom', 'shoes', 'knit', 'dress', 'jacket', 'accessory'][i % 8],
  }))

test('autoLayout works for 1–8 garments, hero first, no random rotation', () => {
  for (let n = 1; n <= 8; n++) {
    const els = autoLayout(garments(n), ['#333333', '#884444'], 'Capsule 01')
    const garmentEls = els.filter((e) => e.kind === 'garment')
    assert.equal(garmentEls.length, n)
    // hero (largest) piece is an outerwear-first pick
    const hero = garmentEls.reduce((a, b) => (a.width > b.width ? a : b))
    assert.ok(hero.width >= Math.max(...garmentEls.map((e) => e.width)))
    // everything on-canvas
    for (const el of els) {
      assert.ok(el.x > 0 && el.x < 1 && el.y > 0 && el.y < 1, `on canvas: ${el.kind}`)
      assert.ok(Math.abs(el.rotation) <= 2, 'no random rotation beyond swatch tilt')
    }
    // at most 3 swatches + 1 caption
    assert.ok(els.filter((e) => e.kind === 'swatch').length <= 3)
    assert.equal(els.filter((e) => e.kind === 'caption').length, 1)
  }
})

test('autoLayout caps garments at eight', () => {
  const els = autoLayout(garments(12), [], 'Overflow')
  assert.equal(els.filter((e) => e.kind === 'garment').length, 8)
})

test('board canvas is the deterministic export base', () => {
  assert.equal(BOARD_CANVAS.width, 1600)
  assert.equal(BOARD_CANVAS.height, 1200)
})
