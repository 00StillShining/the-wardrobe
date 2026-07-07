import type { Category, GarmentTemplate } from '../types'
import type { ShapeKey } from '../../scene/garments/illustrate'

/**
 * The seed capsule — the mood-board wardrobe. Owned pieces are pre-loaded so
 * the Rail, Shelves and Mirror are furnished on first run; a handful of
 * wishlist pieces hang past the brass divider as ghost garments.
 * `shape`/`colors` drive the procedural product photo; the stored palette is
 * then extracted honestly from the generated cutout.
 */
export interface SeedSpec {
  id: string
  name: string
  brand: string
  category: Category
  template: GarmentTemplate
  shape: ShapeKey
  colors: string[]
  owned: boolean
  pricePaid?: number
  merchant: string
}

export const CAPSULE: SeedSpec[] = [
  {
    id: 'seed-knit',
    name: 'Striped Wool Knit',
    brand: 'Bruno Atelier',
    category: 'top',
    template: 'knit',
    shape: 'polo-knit',
    colors: ['#5a4230', '#e8dcc2', '#3d2c1d'],
    owned: true,
    pricePaid: 95,
    merchant: 'Bruno Atelier',
  },
  {
    id: 'seed-denim',
    name: 'Wide-Leg Denim',
    brand: 'Maison Vert',
    category: 'bottom',
    template: 'pants',
    shape: 'wide-jeans',
    colors: ['#33436b', '#4a5a82', '#26324f'],
    owned: true,
    pricePaid: 128,
    merchant: 'Maison Vert',
  },
  {
    id: 'seed-coat',
    name: 'Camel Wool Coat',
    brand: 'The Row House',
    category: 'outerwear',
    template: 'coat',
    shape: 'wool-coat',
    colors: ['#b6976a', '#c9ad82', '#8a6f48'],
    owned: true,
    pricePaid: 340,
    merchant: 'The Row House',
  },
  {
    id: 'seed-tote',
    name: 'Olive Leather Tote',
    brand: 'Fellow & Co.',
    category: 'bag',
    template: 'prop',
    shape: 'tote-bag',
    colors: ['#5c6234', '#6e7444', '#434826'],
    owned: true,
    pricePaid: 175,
    merchant: 'Fellow & Co.',
  },
  {
    id: 'seed-flats',
    name: 'Leopard Mary Janes',
    brand: 'Northgate',
    category: 'shoes',
    template: 'prop',
    shape: 'mary-jane',
    colors: ['#c19a5b', '#d9b877', '#463218'],
    owned: true,
    pricePaid: 145,
    merchant: 'Northgate Dept.',
  },
  {
    id: 'seed-earrings',
    name: 'Gold Drop Earrings',
    brand: 'Fellow & Co.',
    category: 'accessory',
    template: 'prop',
    shape: 'drop-earrings',
    colors: ['#c6a15a', '#e2c684', '#96742f'],
    owned: true,
    pricePaid: 60,
    merchant: 'Fellow & Co.',
  },
  {
    id: 'seed-sunglasses',
    name: 'Oversized Sunglasses',
    brand: 'Bruno Atelier',
    category: 'accessory',
    template: 'prop',
    shape: 'sunglasses',
    colors: ['#3f2a1a', '#7a5a3a', '#241811'],
    owned: true,
    pricePaid: 110,
    merchant: 'Bruno Atelier',
  },
  {
    id: 'seed-cardigan',
    name: 'Cream Wrap Cardigan',
    brand: 'The Row House',
    category: 'top',
    template: 'knit',
    shape: 'wrap-cardigan',
    colors: ['#efe7d3', '#f6f0e2', '#d8cbaf'],
    owned: true,
    pricePaid: 155,
    merchant: 'The Row House',
  },
  {
    id: 'seed-trousers',
    name: 'Chocolate Wide Trousers',
    brand: 'Maison Vert',
    category: 'bottom',
    template: 'pants',
    shape: 'wide-trousers',
    colors: ['#5a4632', '#6d573f', '#3f3020'],
    owned: true,
    pricePaid: 118,
    merchant: 'Maison Vert',
  },
  // —— wishlist (ghost garments) ——
  {
    id: 'seed-wish-dress',
    name: 'Ochre Silk Dress',
    brand: 'Atelier Doré',
    category: 'dress',
    template: 'dress',
    shape: 'dress',
    colors: ['#a9752f', '#c08f42', '#7c5320'],
    owned: false,
    pricePaid: 260,
    merchant: 'Atelier Doré',
  },
  {
    id: 'seed-wish-loafers',
    name: 'Tan Suede Loafers',
    brand: 'Northgate',
    category: 'shoes',
    template: 'prop',
    shape: 'mary-jane',
    colors: ['#b98a53', '#cfa675', '#6e4a26'],
    owned: false,
    pricePaid: 165,
    merchant: 'Northgate Dept.',
  },
]
