import type { SheetElement, StyleSheet, WardrobeItem } from '../../data/types'

const categories = new Set<WardrobeItem['category']>(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'])
const templates = new Set<WardrobeItem['template']>(['tee', 'shirt', 'knit', 'hoodie', 'jacket', 'coat', 'dress', 'skirt', 'pants', 'shorts', 'prop'])
const elementKinds = new Set<SheetElement['kind']>(['cutout', 'swatch', 'image', 'caption'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isStoredWardrobeItems(value: unknown): value is WardrobeItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!isRecord(item) || !isRecord(item.images) || !isRecord(item.source)) return false
      return (
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.brand === 'string' &&
        categories.has(item.category as WardrobeItem['category']) &&
        templates.has(item.template as WardrobeItem['template']) &&
        typeof item.owned === 'boolean' &&
        typeof item.images.original === 'string' &&
        typeof item.images.cutout === 'string' &&
        Array.isArray(item.palette) &&
        item.palette.every((color) => typeof color === 'string') &&
        (item.pricePaid === undefined || typeof item.pricePaid === 'number') &&
        typeof item.currency === 'string' &&
        typeof item.source.addedAt === 'string'
      )
    })
  )
}

function isStoredElement(value: unknown): value is SheetElement {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    elementKinds.has(value.kind as SheetElement['kind']) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.scale === 'number' &&
    typeof value.rotation === 'number' &&
    typeof value.z === 'number' &&
    (value.itemId === undefined || typeof value.itemId === 'string') &&
    (value.color === undefined || typeof value.color === 'string') &&
    (value.text === undefined || typeof value.text === 'string') &&
    (value.imageKey === undefined || typeof value.imageKey === 'string')
  )
}

export function isStoredSheets(value: unknown): value is StyleSheet[] {
  return (
    Array.isArray(value) &&
    value.every(
      (sheet) =>
        isRecord(sheet) &&
        typeof sheet.id === 'string' &&
        typeof sheet.title === 'string' &&
        typeof sheet.createdAt === 'string' &&
        Array.isArray(sheet.elements) &&
        sheet.elements.every(isStoredElement) &&
        (sheet.exportPng === undefined || typeof sheet.exportPng === 'string'),
    )
  )
}
