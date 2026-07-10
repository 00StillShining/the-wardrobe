import type { WardrobeItem } from '../../data/types'

/**
 * Typed layer slots (plan §9.6). Order is paint order, bottom → top.
 * The composition is a flat editorial "look" — the v1 lesson stands:
 * no mannequin, no fake 3D garments, no photorealism claims.
 */

export const LAYER_SLOTS = [
  'shoes',
  'bottom',
  'dress',
  'tee',
  'knit',
  'jacket',
  'coat',
  'accessory',
] as const

export type LayerSlot = (typeof LAYER_SLOTS)[number]

export function slotFor(item: Pick<WardrobeItem, 'layerType'>): LayerSlot {
  return (LAYER_SLOTS as readonly string[]).includes(item.layerType)
    ? (item.layerType as LayerSlot)
    : 'accessory'
}

export function slotIndex(slot: LayerSlot): number {
  return LAYER_SLOTS.indexOf(slot)
}

/** Vertical band each slot occupies in the composition (fractions of height). */
export const BAND: Record<LayerSlot, { top: number; height: number }> = {
  coat: { top: 0.02, height: 0.62 },
  jacket: { top: 0.05, height: 0.55 },
  knit: { top: 0.08, height: 0.42 },
  tee: { top: 0.1, height: 0.4 },
  dress: { top: 0.08, height: 0.62 },
  bottom: { top: 0.42, height: 0.44 },
  shoes: { top: 0.84, height: 0.15 },
  accessory: { top: 0.02, height: 0.2 },
}

/**
 * Conflicts (plan §9.6: show clearly, never silently drop): a dress and a
 * separates-bottom fight for the same visual band; two garments can't share
 * one slot except accessories.
 */
export function conflictsWith(
  slot: LayerSlot,
  existing: { layerSlot: LayerSlot }[],
): string | null {
  if (slot !== 'accessory' && existing.some((e) => e.layerSlot === slot)) {
    return `There is already a piece in the ${slot} layer — remove it first.`
  }
  if (slot === 'dress' && existing.some((e) => e.layerSlot === 'bottom' || e.layerSlot === 'tee')) {
    return 'A dress replaces top and bottom — remove them first.'
  }
  if ((slot === 'bottom' || slot === 'tee') && existing.some((e) => e.layerSlot === 'dress')) {
    return 'Remove the dress before adding separates.'
  }
  return null
}
