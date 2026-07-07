/**
 * The data model (spec §7). Everything the wardrobe knows about a garment.
 * Images are stored as opaque keys resolved through the StorageAdapter —
 * blobs live in IndexedDB, only metadata lives in localStorage.
 */

export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory'

export type GarmentTemplate =
  | 'tee'
  | 'shirt'
  | 'knit'
  | 'hoodie'
  | 'jacket'
  | 'coat'
  | 'dress'
  | 'skirt'
  | 'pants'
  | 'shorts'
  | 'prop'

export interface WardrobeItem {
  id: string
  name: string
  brand: string
  category: Category
  template: GarmentTemplate
  owned: boolean
  /** storage keys, not URLs — resolve via useObjectUrl / StorageAdapter */
  images: { original: string; cutout: string }
  /** extracted hexes, palette[0] is the dominant tint */
  palette: string[]
  pricePaid?: number
  currency: string
  source: { receiptId?: string; merchant?: string; addedAt: string }
}

export interface PriceListing {
  shop: string
  price: number
  url: string
  checkedAt: string
}

export type SheetElementKind = 'cutout' | 'swatch' | 'image' | 'caption'

export interface SheetElement {
  id: string
  kind: SheetElementKind
  /** normalised 0..1 within the sheet */
  x: number
  y: number
  scale: number
  rotation: number
  z: number
  itemId?: string
  color?: string
  text?: string
  imageKey?: string
}

export interface StyleSheet {
  id: string
  title: string
  elements: SheetElement[]
  createdAt: string
  exportPng?: string
}

/* —— receipt / import shapes —— */

export interface ReceiptLineItem {
  name: string
  brand: string
  price: number
  currency: string
  imageUrl: string
  category: Category
  template: GarmentTemplate
}

export interface ParsedReceipt {
  id: string
  merchant: string
  date: string
  currency: string
  items: ReceiptLineItem[]
}

/** A raw receipt as it would arrive from an inbox — HTML body + metadata. */
export interface RawReceipt {
  id: string
  from: string
  subject: string
  receivedAt: string
  /** realistic HTML body; the parser must earn its cutout */
  html: string
}
