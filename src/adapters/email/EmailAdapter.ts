import type { RawReceipt } from '../../data/types'
import { INBOX, type InboxSpec } from '../../data/seeds/receipts'
import { illustrateToDataUrl } from '../../scene/garments/illustrate'

/**
 * Inbox boundary (spec §6). SampleEmailAdapter renders each seed receipt into a
 * realistic, merchant-varied HTML body with the product photo embedded as a
 * real data-URI (so import runs bg-removal over genuine pixels). GmailAdapter
 * is a stub whose TODOs outline the real OAuth flow.
 */
export interface EmailAdapter {
  listReceipts(): Promise<RawReceipt[]>
  getReceipt(id: string): Promise<RawReceipt | null>
}

function lineHtml(spec: InboxSpec) {
  return spec.items
    .map((it) => {
      const img = illustrateToDataUrl(it.shape, it.colors)
      // data-category / data-template stand in for a real classifier (out of scope)
      const imgTag = `<img data-field="image" data-category="${it.category}" data-template="${it.template}" src="${img}" width="72" alt="${it.name}"/>`
      const price = `£${it.price.toFixed(2)}`
      if (spec.layout === 'table') {
        return `<tr data-line-item><td>${imgTag}</td><td data-field="name">${it.name}</td><td data-field="brand">${it.brand}</td><td data-field="price">${price}</td></tr>`
      }
      if (spec.layout === 'cards') {
        return `<div class="product" data-line-item>${imgTag}<div><h4 data-field="name">${it.name}</h4><span data-field="brand">${it.brand}</span><strong data-field="price">${price}</strong></div></div>`
      }
      return `<li data-line-item>${imgTag}<span data-field="name">${it.name}</span> — <span data-field="brand">${it.brand}</span> <b data-field="price">${price}</b></li>`
    })
    .join('\n')
}

function renderHtml(spec: InboxSpec): string {
  if (spec.broken) {
    // No structured products — the parser must fail gracefully into the error card.
    return `<div style="font-family:Georgia,serif;padding:24px">
      <p>Thank you for shopping with ${spec.merchant}.</p>
      <p>Your order is confirmed and on its way. This email could not display your itemised receipt — please see your account for details.</p>
    </div>`
  }
  const total = spec.items.reduce((s, i) => s + i.price, 0)
  const body = lineHtml(spec)
  const wrap =
    spec.layout === 'table'
      ? `<table data-receipt><thead><tr><th></th><th>Item</th><th>Brand</th><th>Price</th></tr></thead><tbody>${body}</tbody></table>`
      : spec.layout === 'cards'
        ? `<section data-receipt>${body}</section>`
        : `<ul data-receipt>${body}</ul>`
  return `<div style="font-family:Georgia,serif;max-width:520px;padding:20px;color:#2b2620">
    <h2 style="font-weight:500">${spec.merchant}</h2>
    <p style="color:#6b6355">Order confirmation · ${spec.receivedAt}</p>
    ${wrap}
    <p style="margin-top:16px"><strong>Total paid: £${total.toFixed(2)}</strong></p>
  </div>`
}

export const sampleEmailAdapter: EmailAdapter = {
  async listReceipts() {
    return INBOX.map((spec) => ({
      id: spec.id,
      from: spec.from,
      subject: spec.subject,
      receivedAt: spec.receivedAt,
      html: renderHtml(spec),
    }))
  },
  async getReceipt(id) {
    const spec = INBOX.find((s) => s.id === id)
    if (!spec) return null
    return { id: spec.id, from: spec.from, subject: spec.subject, receivedAt: spec.receivedAt, html: renderHtml(spec) }
  },
}
