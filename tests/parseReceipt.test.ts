import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReceipt } from '../src/adapters/email/parse'
import type { RawReceipt } from '../src/data/types'

class FakeElement {
  constructor(private html: string) {}

  get textContent() {
    return this.html
      .replace(/<[^>]*>/g, '')
      .replace(/&pound;/g, '£')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
  }

  querySelector(selector: string): FakeElement | FakeImageElement | null {
    if (selector === 'img[data-field="image"]') {
      const match = this.html.match(/<img\b(?=[^>]*\bdata-field=["']image["'])[^>]*>/i)
      return match ? new FakeImageElement(match[0]) : null
    }

    const field = selector.match(/^\[data-field="([^"]+)"\]$/)?.[1]
    if (field) {
      const pattern = new RegExp(`<([a-z0-9]+)\\b(?=[^>]*\\bdata-field=["']${field}["'])[^>]*>[\\s\\S]*?<\\/\\1>`, 'i')
      const match = this.html.match(pattern)
      return match ? new FakeElement(match[0]) : null
    }

    if (selector === 'h2') {
      const match = this.html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i)
      return match ? new FakeElement(match[0]) : null
    }

    return null
  }

  querySelectorAll(selector: string): FakeElement[] {
    if (selector !== '[data-line-item]') return []
    const items: FakeElement[] = []
    const pattern = /<([a-z0-9]+)\b(?=[^>]*\bdata-line-item\b)[^>]*>[\s\S]*?<\/\1>/gi
    for (const match of this.html.matchAll(pattern)) items.push(new FakeElement(match[0]))
    return items
  }
}

class FakeImageElement extends FakeElement {
  private attrs: Record<string, string>

  constructor(html: string) {
    super(html)
    this.attrs = Object.fromEntries([...html.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map((match) => [match[1], match[2]]))
  }

  getAttribute(name: string) {
    return this.attrs[name] ?? null
  }
}

globalThis.DOMParser = class {
  parseFromString(html: string) {
    return new FakeElement(html)
  }
} as typeof DOMParser

function raw(html: string): RawReceipt {
  return {
    id: 'receipt-1',
    from: 'orders@example.com',
    subject: 'Order confirmed',
    receivedAt: '2026-06-28',
    html,
  }
}

test('parseReceipt extracts a structured line item', () => {
  const parsed = parseReceipt(
    raw(`
      <h2>Bruno Atelier</h2>
      <table data-receipt>
        <tr data-line-item>
          <td><img data-field="image" data-category="top" data-template="knit" src="data:image/png;base64,abc" /></td>
          <td data-field="name">Rust Polo Knit</td>
          <td data-field="brand">Bruno Atelier</td>
          <td data-field="price">£92.00</td>
        </tr>
      </table>
    `),
  )

  assert.equal(parsed.id, 'receipt-1')
  assert.equal(parsed.merchant, 'Bruno Atelier')
  assert.equal(parsed.date, '2026-06-28')
  assert.equal(parsed.currency, 'GBP')
  assert.deepEqual(parsed.items, [
    {
      name: 'Rust Polo Knit',
      brand: 'Bruno Atelier',
      price: 92,
      currency: 'GBP',
      imageUrl: 'data:image/png;base64,abc',
      category: 'top',
      template: 'knit',
    },
  ])
})

test('parseReceipt skips malformed line items without failing the receipt', () => {
  const parsed = parseReceipt(
    raw(`
      <h2>Maison Vert</h2>
      <section data-receipt>
        <div data-line-item>
          <img data-field="image" data-category="bottom" data-template="pants" src="one.png" />
          <span data-field="name">Wide Trousers</span>
          <span data-field="brand">Maison Vert</span>
          <strong data-field="price">£124</strong>
        </div>
        <div data-line-item>
          <span data-field="name">No Product Image</span>
          <strong data-field="price">£50</strong>
        </div>
      </section>
    `),
  )

  assert.equal(parsed.items.length, 1)
  assert.equal(parsed.items[0].name, 'Wide Trousers')
  assert.equal(parsed.items[0].price, 124)
})

test('parseReceipt returns an empty item list for unstructured receipts', () => {
  const parsed = parseReceipt(
    raw(`
      <p>Thank you for shopping with Northgate.</p>
      <p>Your itemised receipt could not display.</p>
    `),
  )

  assert.equal(parsed.merchant, 'example.com')
  assert.deepEqual(parsed.items, [])
})
