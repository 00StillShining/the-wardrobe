/**
 * Style-board document model (plan §9.7): a structured, versioned document —
 * never only a flattened image. Coordinates are normalized (0..1) against the
 * canvas so exports at any pixel ratio are deterministic.
 */

export const BOARD_DOCUMENT_VERSION = 1
export const BOARD_CANVAS = { width: 1600, height: 1200 } as const

export type BoardElementKind = 'garment' | 'swatch' | 'caption' | 'rule'

export interface BoardElementDoc {
  id: string
  kind: BoardElementKind
  /** normalized centre position */
  x: number
  y: number
  /** normalized width; height derives from the element's aspect */
  width: number
  rotation: number
  zIndex: number
  locked: boolean
  hidden: boolean
  /** garment: wardrobe item id */
  itemId?: string
  /** swatch: hex fill */
  color?: string
  /** caption: serif text */
  text?: string
}

let counter = 0
export function elementId(): string {
  // deterministic-enough for a client document; persistence assigns real ids
  return `el-${Date.now().toString(36)}-${(counter++).toString(36)}`
}

/**
 * Default auto-layout (plan §9.7): editorial, calm, no random rotation.
 * Hero pieces (outerwear/dresses first) anchor left; supporting pieces step
 * down the right; at most three swatches season the composition.
 */
export function autoLayout(
  garments: { itemId: string; layerType: string }[],
  palette: string[],
  title: string,
): BoardElementDoc[] {
  const heroOrder = ['coat', 'jacket', 'dress', 'knit', 'tee', 'bottom', 'shoes', 'accessory']
  const sorted = [...garments]
    .sort((a, b) => heroOrder.indexOf(a.layerType) - heroOrder.indexOf(b.layerType))
    .slice(0, 8)

  const elements: BoardElementDoc[] = []
  const n = sorted.length

  sorted.forEach((g, i) => {
    const hero = i === 0
    const col = hero ? 0 : 1 + ((i - 1) % 2)
    const row = hero ? 0 : Math.floor((i - 1) / 2)
    const rows = Math.max(1, Math.ceil((n - 1) / 2))
    elements.push({
      id: elementId(),
      kind: 'garment',
      itemId: g.itemId,
      x: hero ? 0.27 : 0.55 + col * 0.21,
      y: hero ? 0.46 : 0.18 + ((row + 0.5) / rows) * 0.64,
      width: hero ? 0.34 : 0.17,
      rotation: 0,
      zIndex: i,
      locked: false,
      hidden: false,
    })
  })

  palette.slice(0, 3).forEach((color, i) => {
    elements.push({
      id: elementId(),
      kind: 'swatch',
      color,
      x: 0.09 + i * 0.075,
      y: 0.86,
      width: 0.06,
      rotation: i === 1 ? 2 : -2,
      zIndex: 100 + i,
      locked: false,
      hidden: false,
    })
  })

  elements.push({
    id: elementId(),
    kind: 'caption',
    text: title,
    x: 0.27,
    y: 0.09,
    width: 0.38,
    rotation: 0,
    zIndex: 200,
    locked: false,
    hidden: false,
  })

  return elements
}
