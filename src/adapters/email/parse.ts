import type { RawReceipt, ParsedReceipt, ReceiptLineItem, Category, GarmentTemplate } from '../../data/types'

/**
 * Receipt parser. Reads a receipt's HTML body into structured line items by
 * DOM traversal — tolerant of the merchant layout variations, and honest:
 * a body with no parseable products yields an empty item list, which the UI
 * turns into the "couldn't read this one" error card.
 */

const PRICE_RE = /£\s?(\d+(?:\.\d{1,2})?)/

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').trim()
}

function parseLineItem(node: Element, currency: string): ReceiptLineItem | null {
  const name = textOf(node.querySelector('[data-field="name"]'))
  if (!name) return null
  const brand = textOf(node.querySelector('[data-field="brand"]')) || 'Unknown'
  const priceText = textOf(node.querySelector('[data-field="price"]')) || node.textContent || ''
  const m = priceText.match(PRICE_RE)
  if (!m) return null
  const price = parseFloat(m[1])
  const img = node.querySelector('img[data-field="image"]') as HTMLImageElement | null
  const imageUrl = img?.getAttribute('src') ?? ''
  if (!imageUrl) return null
  const category = (img?.getAttribute('data-category') as Category) ?? 'top'
  const template = (img?.getAttribute('data-template') as GarmentTemplate) ?? 'tee'
  return { name, brand, price, currency, imageUrl, category, template }
}

export function parseReceipt(raw: RawReceipt): ParsedReceipt {
  const doc = new DOMParser().parseFromString(raw.html, 'text/html')
  const currency = 'GBP'
  const nodes = Array.from(doc.querySelectorAll('[data-line-item]'))
  const items: ReceiptLineItem[] = []
  for (const node of nodes) {
    const item = parseLineItem(node, currency)
    if (item) items.push(item)
  }
  // merchant name from the receipt heading, falling back to the sender domain
  const merchant = textOf(doc.querySelector('h2')) || raw.from.split('@')[1] || raw.from
  return {
    id: raw.id,
    merchant,
    date: raw.receivedAt,
    currency,
    items,
  }
}
