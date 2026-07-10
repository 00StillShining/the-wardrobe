import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conflictsWith, slotFor, LAYER_SLOTS } from '../src/revamp/features/outfits/layerModel'
import { useOutfitEditor } from '../src/revamp/features/outfits/editorStore'

test('layer conflicts: one per slot, dress vs separates', () => {
  assert.equal(conflictsWith('coat', []), null)
  assert.ok(conflictsWith('coat', [{ layerSlot: 'coat' }]))
  assert.ok(conflictsWith('dress', [{ layerSlot: 'bottom' }]))
  assert.ok(conflictsWith('dress', [{ layerSlot: 'tee' }]))
  assert.ok(conflictsWith('bottom', [{ layerSlot: 'dress' }]))
  assert.equal(conflictsWith('accessory', [{ layerSlot: 'accessory' }]), null)
  assert.equal(conflictsWith('dress', [{ layerSlot: 'coat' }]), null)
})

test('slotFor maps unknown layer types to accessory', () => {
  assert.equal(slotFor({ layerType: 'knit' }), 'knit')
  assert.equal(slotFor({ layerType: 'weird' }), 'accessory')
  for (const slot of LAYER_SLOTS) assert.equal(slotFor({ layerType: slot }), slot)
})

test('outfit editor: undo/redo with bounded history and dirty tracking', () => {
  const store = useOutfitEditor.getState()
  store.load(null, 'Test', [])
  assert.equal(useOutfitEditor.getState().dirty, false)

  store.apply([{ itemId: 'a', layerSlot: 'tee', sortOrder: 0 }])
  store.apply([
    { itemId: 'a', layerSlot: 'tee', sortOrder: 0 },
    { itemId: 'b', layerSlot: 'coat', sortOrder: 1 },
  ])
  assert.equal(useOutfitEditor.getState().layers.length, 2)
  assert.equal(useOutfitEditor.getState().dirty, true)

  useOutfitEditor.getState().undo()
  assert.equal(useOutfitEditor.getState().layers.length, 1)
  useOutfitEditor.getState().redo()
  assert.equal(useOutfitEditor.getState().layers.length, 2)

  // history is bounded
  for (let i = 0; i < 60; i++) useOutfitEditor.getState().apply([])
  assert.ok(useOutfitEditor.getState().past.length <= 40)
})
