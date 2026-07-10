import test from 'node:test'
import assert from 'node:assert/strict'
import type { WardrobeItem } from '../src/data/types'
import { useSelection } from '../src/state/selection'
import { autoLayout } from '../src/state/sheets'
import { usePreferences } from '../src/state/preferences'

function item(id: string, category: WardrobeItem['category'], palette: string[]): WardrobeItem {
  return {
    id,
    name: id,
    brand: 'Test Brand',
    category,
    template: category === 'outerwear' ? 'coat' : category === 'bottom' ? 'pants' : category === 'bag' ? 'prop' : 'knit',
    owned: true,
    images: { original: `orig:${id}`, cutout: `cut:${id}` },
    palette,
    currency: 'GBP',
    source: { addedAt: '2026-06-01' },
  }
}

test('selection store toggles selected ids and clears them when select mode closes', () => {
  useSelection.setState({ focused: null, selectMode: false, selected: new Set() })

  useSelection.getState().toggleSelectMode()
  useSelection.getState().toggleSelected('seed-knit')
  useSelection.getState().toggleSelected('seed-coat')

  assert.equal(useSelection.getState().selectMode, true)
  assert.deepEqual([...useSelection.getState().selected].sort(), ['seed-coat', 'seed-knit'])

  useSelection.getState().toggleSelected('seed-knit')
  assert.deepEqual([...useSelection.getState().selected], ['seed-coat'])

  useSelection.getState().toggleSelectMode()
  assert.equal(useSelection.getState().selectMode, false)
  assert.equal(useSelection.getState().selected.size, 0)
})

test('autoLayout ranks hero garments first and caps cutouts at eight', () => {
  const layout = autoLayout([
    item('bag', 'bag', ['#111111']),
    item('top', 'top', ['#222222']),
    item('coat', 'outerwear', ['#333333']),
    item('bottom', 'bottom', ['#444444']),
    item('accessory-1', 'accessory', ['#555555']),
    item('accessory-2', 'accessory', ['#666666']),
    item('accessory-3', 'accessory', ['#777777']),
    item('accessory-4', 'accessory', ['#888888']),
    item('accessory-5', 'accessory', ['#999999']),
  ])

  const cutouts = layout.filter((el) => el.kind === 'cutout')
  assert.equal(cutouts.length, 8)
  assert.equal(cutouts[0].itemId, 'coat')
  assert.equal(cutouts[1].itemId, 'top')
  assert.equal(cutouts[2].itemId, 'bottom')
})

test('autoLayout adds palette swatches and a caption', () => {
  const layout = autoLayout([
    item('coat', 'outerwear', ['#333333']),
    item('top', 'top', ['#333333']),
    item('bottom', 'bottom', ['#444444']),
    item('bag', 'bag', ['#555555']),
  ])

  const swatches = layout.filter((el) => el.kind === 'swatch')
  const captions = layout.filter((el) => el.kind === 'caption')

  assert.deepEqual(
    swatches.map((el) => el.color),
    ['#333333', '#444444', '#555555'],
  )
  assert.equal(captions.length, 1)
  assert.equal(captions[0].text, 'Autumn Capsule')
})

test('preferences persist onboarding, profile, and motion choices', () => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
      key: (index: number) => [...data.keys()][index] ?? null,
      get length() { return data.size },
    },
  })

  usePreferences.setState({ displayName: 'My wardrobe', onboardingComplete: false, reducedMotion: false, ready: false })
  usePreferences.getState().init()
  usePreferences.getState().setDisplayName('Alex')
  usePreferences.getState().setReducedMotion(true)
  usePreferences.getState().completeOnboarding()

  assert.equal(usePreferences.getState().displayName, 'Alex')
  assert.equal(usePreferences.getState().reducedMotion, true)
  assert.equal(usePreferences.getState().onboardingComplete, true)
  assert.deepEqual(JSON.parse(data.get('wardrobe:preferences') ?? '{}'), {
    displayName: 'Alex',
    onboardingComplete: true,
    reducedMotion: true,
  })
})
