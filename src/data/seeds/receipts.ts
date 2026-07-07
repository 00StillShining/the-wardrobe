import type { Category, GarmentTemplate } from '../types'
import type { ShapeKey } from '../../scene/garments/illustrate'

/**
 * The mock inbox — receipts for NEW pieces (not in the seed capsule), so the
 * scan→confirm→cutout→hang flow genuinely adds garments. Merchants differ in
 * HTML layout (see EmailAdapter) so the parser has to earn its cutout; one
 * receipt is deliberately unparseable to exercise the error card.
 */
export interface InboxLineSpec {
  name: string
  brand: string
  price: number
  category: Category
  template: GarmentTemplate
  shape: ShapeKey
  colors: string[]
}

export interface InboxSpec {
  id: string
  merchant: string
  from: string
  subject: string
  receivedAt: string
  currency: string
  /** 'table' | 'cards' | 'list' — merchant HTML dialect */
  layout: 'table' | 'cards' | 'list'
  items: InboxLineSpec[]
  /** when true, render a malformed body the parser can't read */
  broken?: boolean
}

export const INBOX: InboxSpec[] = [
  {
    id: 'rcpt-bruno-1',
    merchant: 'Bruno Atelier',
    from: 'orders@brunoatelier.com',
    subject: 'Your Bruno Atelier order #BA-4471',
    receivedAt: '2026-06-28',
    currency: 'GBP',
    layout: 'table',
    items: [
      {
        name: 'Rust Polo Knit',
        brand: 'Bruno Atelier',
        price: 92,
        category: 'top',
        template: 'knit',
        shape: 'polo-knit',
        colors: ['#9a4e2c', '#e8dcc2', '#6e341a'],
      },
    ],
  },
  {
    id: 'rcpt-vert-1',
    merchant: 'Maison Vert',
    from: 'no-reply@maisonvert.fr',
    subject: 'Confirmation de commande — Maison Vert',
    receivedAt: '2026-06-25',
    currency: 'GBP',
    layout: 'cards',
    items: [
      {
        name: 'Charcoal Wide Trousers',
        brand: 'Maison Vert',
        price: 124,
        category: 'bottom',
        template: 'pants',
        shape: 'wide-trousers',
        colors: ['#3a3a3f', '#4a4a50', '#28282c'],
      },
      {
        name: 'Stone Wide Denim',
        brand: 'Maison Vert',
        price: 132,
        category: 'bottom',
        template: 'pants',
        shape: 'wide-jeans',
        colors: ['#b8ad97', '#ccc2ad', '#8f846e'],
      },
    ],
  },
  {
    id: 'rcpt-fellow-1',
    merchant: 'Fellow & Co.',
    from: 'receipts@fellowandco.com',
    subject: 'Thanks for your order',
    receivedAt: '2026-06-22',
    currency: 'GBP',
    layout: 'list',
    items: [
      {
        name: 'Black Leather Tote',
        brand: 'Fellow & Co.',
        price: 190,
        category: 'bag',
        template: 'prop',
        shape: 'tote-bag',
        colors: ['#2c2a28', '#3d3a36', '#161412'],
      },
      {
        name: 'Silver Drop Earrings',
        brand: 'Fellow & Co.',
        price: 68,
        category: 'accessory',
        template: 'prop',
        shape: 'drop-earrings',
        colors: ['#b9bcc0', '#dde0e3', '#8a8d92'],
      },
    ],
  },
  {
    id: 'rcpt-row-1',
    merchant: 'The Row House',
    from: 'hello@therowhouse.co',
    subject: 'Order confirmed — The Row House',
    receivedAt: '2026-06-19',
    currency: 'GBP',
    layout: 'table',
    items: [
      {
        name: 'Bordeaux Wool Coat',
        brand: 'The Row House',
        price: 355,
        category: 'outerwear',
        template: 'coat',
        shape: 'wool-coat',
        colors: ['#6e2b24', '#853730', '#4c1c17'],
      },
    ],
  },
  {
    id: 'rcpt-row-2',
    merchant: 'The Row House',
    from: 'hello@therowhouse.co',
    subject: 'Order confirmed — The Row House',
    receivedAt: '2026-06-12',
    currency: 'GBP',
    layout: 'cards',
    items: [
      {
        name: 'Forest Wrap Cardigan',
        brand: 'The Row House',
        price: 160,
        category: 'top',
        template: 'knit',
        shape: 'wrap-cardigan',
        colors: ['#33463c', '#3f544a', '#243029'],
      },
    ],
  },
  {
    id: 'rcpt-bruno-2',
    merchant: 'Bruno Atelier',
    from: 'orders@brunoatelier.com',
    subject: 'Your Bruno Atelier order #BA-4520',
    receivedAt: '2026-06-08',
    currency: 'GBP',
    layout: 'list',
    items: [
      {
        name: 'Amber Sunglasses',
        brand: 'Bruno Atelier',
        price: 115,
        category: 'accessory',
        template: 'prop',
        shape: 'sunglasses',
        colors: ['#5a3a1e', '#c8913f', '#33200f'],
      },
    ],
  },
  {
    id: 'rcpt-broken',
    merchant: 'Northgate Dept.',
    from: 'auto@northgate.example',
    subject: 'Your receipt',
    receivedAt: '2026-06-04',
    currency: 'GBP',
    layout: 'table',
    broken: true,
    items: [
      {
        name: 'Suede Chelsea Boots',
        brand: 'Northgate',
        price: 210,
        category: 'shoes',
        template: 'prop',
        shape: 'mary-jane',
        colors: ['#6e4a2c', '#875e3a', '#4a301b'],
      },
    ],
  },
]
