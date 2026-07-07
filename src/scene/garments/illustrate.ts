/**
 * Procedural "product photos" for the seed capsule.
 * Each garment is drawn flat-lay on a uniform cool-grey studio ground so the
 * background-removal keyer has an honest, uniform field to cut. No baked
 * shadow — the soft drop shadow onto the cabinet back panel is added in 3D.
 *
 * Shapes are editorial line-drawing style: clean filled silhouettes with a
 * soft directional sheen, tuned to the mood-board capsule.
 */

export const STUDIO_BG = '#cfd1cb' // cool neutral; every capsule colour is warm/navy → keys clean

export type ShapeKey =
  | 'polo-knit'
  | 'wrap-cardigan'
  | 'wide-jeans'
  | 'wide-trousers'
  | 'wool-coat'
  | 'tote-bag'
  | 'mary-jane'
  | 'drop-earrings'
  | 'sunglasses'
  | 'tee'
  | 'dress'
  | 'skirt'

export interface Illustration {
  colors: string[] // [main, accent, detail]
}

const W = 512
const H = 680

function shade(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, a: string, b: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  return g
}

function mix(hex: string, target: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const [r1, g1, b1] = p(hex)
  const [r2, g2, b2] = p(target)
  const c = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${c(r1, r2)},${c(g1, g2)},${c(b1, b2)})`
}
const lighten = (hex: string, t = 0.18) => mix(hex, '#ffffff', t)
const darken = (hex: string, t = 0.2) => mix(hex, '#1a140d', t)

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/* ————— garments ————— */

function drawPoloKnit(ctx: CanvasRenderingContext2D, c: string[]) {
  const [body, stripe] = [c[0] ?? '#5a4231', c[1] ?? '#e9dfca']
  const cx = W / 2
  const shoulderY = 0.3 * H
  const hemY = 0.68 * H
  const halfTop = 0.2 * W
  const halfHem = 0.235 * W

  // sleeves (behind)
  ctx.fillStyle = darken(body, 0.08)
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * halfTop * 0.9, shoulderY + 6)
    ctx.lineTo(cx + s * (halfTop + 0.12 * W), shoulderY + 0.05 * H)
    ctx.lineTo(cx + s * (halfTop + 0.1 * W), shoulderY + 0.22 * H)
    ctx.lineTo(cx + s * halfTop * 0.72, shoulderY + 0.14 * H)
    ctx.closePath()
    ctx.fill()
  }

  // body path
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - halfTop, shoulderY)
  ctx.lineTo(cx + halfTop, shoulderY)
  ctx.lineTo(cx + halfHem, hemY)
  ctx.lineTo(cx - halfHem, hemY)
  ctx.closePath()
  ctx.fillStyle = shade(ctx, cx - halfHem, shoulderY, cx + halfHem, hemY, lighten(body, 0.12), darken(body, 0.05))
  ctx.fill()
  ctx.clip()
  // knit stripes
  ctx.fillStyle = stripe
  for (let y = shoulderY + 0.05 * H; y < hemY; y += 0.052 * H) {
    ctx.fillRect(cx - halfHem, y, halfHem * 2, 0.02 * H)
  }
  ctx.restore()

  // ribbed hem
  ctx.fillStyle = darken(body, 0.14)
  ctx.fillRect(cx - halfHem, hemY - 0.02 * H, halfHem * 2, 0.02 * H)

  // polo collar
  ctx.fillStyle = darken(body, 0.16)
  ctx.beginPath()
  ctx.moveTo(cx - 0.07 * W, shoulderY - 0.005 * H)
  ctx.lineTo(cx, shoulderY + 0.06 * H)
  ctx.lineTo(cx + 0.07 * W, shoulderY - 0.005 * H)
  ctx.lineTo(cx + 0.045 * W, shoulderY - 0.03 * H)
  ctx.lineTo(cx - 0.045 * W, shoulderY - 0.03 * H)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = stripe
  ctx.fillRect(cx - 0.05 * W, shoulderY - 0.03 * H, 0.1 * W, 0.008 * H)
}

function drawWrapCardigan(ctx: CanvasRenderingContext2D, c: string[]) {
  const body = c[0] ?? '#efe7d4'
  const cx = W / 2
  const shoulderY = 0.28 * H
  const hemY = 0.72 * H
  const halfTop = 0.22 * W
  const halfHem = 0.26 * W

  // sleeves
  ctx.fillStyle = darken(body, 0.05)
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * halfTop * 0.85, shoulderY + 8)
    ctx.lineTo(cx + s * (halfTop + 0.14 * W), shoulderY + 0.07 * H)
    ctx.lineTo(cx + s * (halfTop + 0.11 * W), shoulderY + 0.26 * H)
    ctx.lineTo(cx + s * halfTop * 0.6, shoulderY + 0.16 * H)
    ctx.closePath()
    ctx.fill()
  }

  // body
  ctx.beginPath()
  ctx.moveTo(cx - halfTop, shoulderY)
  ctx.lineTo(cx + halfTop, shoulderY)
  ctx.lineTo(cx + halfHem, hemY)
  ctx.lineTo(cx - halfHem, hemY)
  ctx.closePath()
  ctx.fillStyle = shade(ctx, cx - halfHem, shoulderY, cx + halfHem, hemY, lighten(body, 0.1), darken(body, 0.06))
  ctx.fill()

  // chunky vertical rib
  ctx.strokeStyle = darken(body, 0.07)
  ctx.lineWidth = 2
  for (let i = -5; i <= 5; i++) {
    const x = cx + i * 0.045 * W
    ctx.beginPath()
    ctx.moveTo(x, shoulderY + 0.02 * H)
    ctx.lineTo(x + i * 0.004 * W, hemY - 0.01 * H)
    ctx.stroke()
  }

  // shawl wrap collar (two thick bands crossing into a V)
  ctx.fillStyle = darken(body, 0.1)
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.09 * W, shoulderY - 0.01 * H)
    ctx.quadraticCurveTo(cx + s * 0.02 * W, shoulderY + 0.2 * H, cx - s * 0.02 * W, hemY)
    ctx.lineTo(cx - s * 0.08 * W, hemY)
    ctx.quadraticCurveTo(cx + s * 0.0 * W, shoulderY + 0.2 * H, cx + s * 0.17 * W, shoulderY - 0.01 * H)
    ctx.closePath()
    ctx.fill()
  }
  // tie belt
  ctx.fillStyle = darken(body, 0.14)
  ctx.fillRect(cx - halfHem * 0.92, 0.52 * H, halfHem * 1.84, 0.03 * H)
}

function drawTrousers(ctx: CanvasRenderingContext2D, c: string[], denim: boolean) {
  const body = c[0] ?? (denim ? '#33436b' : '#5a4632')
  const cx = W / 2
  const waistY = 0.24 * H
  const hemY = 0.82 * H
  const halfWaist = 0.19 * W
  const legTopHalf = 0.185 * W
  const legBotHalf = 0.15 * W
  const gap = 0.012 * W

  ctx.fillStyle = shade(ctx, cx, waistY, cx, hemY, lighten(body, 0.1), darken(body, 0.08))
  // waistband
  roundRect(ctx, cx - halfWaist, waistY, halfWaist * 2, 0.05 * H, 6)
  ctx.fill()
  // two wide legs
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * gap, waistY + 0.04 * H)
    ctx.lineTo(cx + s * legTopHalf * 2, waistY + 0.05 * H)
    ctx.lineTo(cx + s * legBotHalf * 2 - s * -0.0, hemY)
    ctx.lineTo(cx + s * gap + s * 0.02 * W, hemY)
    ctx.closePath()
    ctx.fill()
  }

  if (denim) {
    // seams + fly + pockets in lighter thread
    ctx.strokeStyle = lighten(body, 0.28)
    ctx.lineWidth = 1.4
    ctx.setLineDash([5, 4])
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * legTopHalf * 1.4, waistY + 0.06 * H)
      ctx.lineTo(cx + s * legBotHalf * 1.4, hemY - 4)
      ctx.stroke()
    }
    ctx.setLineDash([])
    // fly
    ctx.beginPath()
    ctx.moveTo(cx, waistY + 0.05 * H)
    ctx.lineTo(cx, waistY + 0.16 * H)
    ctx.stroke()
    // waistband topstitch
    ctx.strokeStyle = lighten(body, 0.28)
    ctx.setLineDash([5, 4])
    ctx.strokeRect(cx - halfWaist + 3, waistY + 4, halfWaist * 2 - 6, 0.05 * H - 8)
    ctx.setLineDash([])
    // button
    ctx.fillStyle = lighten(body, 0.35)
    ctx.beginPath()
    ctx.arc(cx + 0.02 * W, waistY + 0.03 * H, 5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // pressed front crease
    ctx.strokeStyle = lighten(body, 0.16)
    ctx.lineWidth = 2
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * legTopHalf, waistY + 0.06 * H)
      ctx.lineTo(cx + s * legBotHalf, hemY - 6)
      ctx.stroke()
    }
    // pleats
    ctx.strokeStyle = darken(body, 0.12)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * 0.05 * W, waistY + 0.05 * H)
      ctx.lineTo(cx + s * 0.05 * W, waistY + 0.12 * H)
      ctx.stroke()
    }
  }
}

function drawWoolCoat(ctx: CanvasRenderingContext2D, c: string[]) {
  const body = c[0] ?? '#b79a6f'
  const cx = W / 2
  const shoulderY = 0.2 * H
  const hemY = 0.86 * H
  const halfTop = 0.19 * W
  const halfHem = 0.25 * W

  // sleeves
  ctx.fillStyle = darken(body, 0.08)
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * halfTop, shoulderY + 6)
    ctx.lineTo(cx + s * (halfTop + 0.11 * W), shoulderY + 0.06 * H)
    ctx.lineTo(cx + s * (halfHem + 0.02 * W), hemY - 0.06 * H)
    ctx.lineTo(cx + s * (halfHem - 0.08 * W), hemY - 0.06 * H)
    ctx.closePath()
    ctx.fill()
  }
  // body
  ctx.beginPath()
  ctx.moveTo(cx - halfTop, shoulderY)
  ctx.lineTo(cx + halfTop, shoulderY)
  ctx.lineTo(cx + halfHem, hemY)
  ctx.lineTo(cx - halfHem, hemY)
  ctx.closePath()
  ctx.fillStyle = shade(ctx, cx - halfHem, shoulderY, cx + halfHem, hemY, lighten(body, 0.12), darken(body, 0.07))
  ctx.fill()
  // centre placket seam
  ctx.strokeStyle = darken(body, 0.1)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, shoulderY + 0.05 * H)
  ctx.lineTo(cx, hemY)
  ctx.stroke()
  // lapels
  ctx.fillStyle = lighten(body, 0.06)
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx, shoulderY + 0.02 * H)
    ctx.lineTo(cx + s * 0.11 * W, shoulderY - 0.005 * H)
    ctx.lineTo(cx + s * 0.05 * W, shoulderY + 0.18 * H)
    ctx.lineTo(cx, shoulderY + 0.16 * H)
    ctx.closePath()
    ctx.fill()
  }
  // double-breasted buttons
  ctx.fillStyle = darken(body, 0.28)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(cx + s * 0.07 * W, shoulderY + 0.24 * H + i * 0.13 * H, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // belt
  ctx.fillStyle = darken(body, 0.12)
  ctx.fillRect(cx - halfHem * 0.95, 0.52 * H, halfHem * 1.9, 0.035 * H)
  ctx.fillStyle = darken(body, 0.3)
  ctx.fillRect(cx - 0.03 * W, 0.515 * H, 0.06 * W, 0.045 * H)
}

function drawToteBag(ctx: CanvasRenderingContext2D, c: string[]) {
  const body = c[0] ?? '#5c6234'
  const cx = W / 2
  const topY = 0.42 * H
  const botY = 0.78 * H
  const halfTop = 0.2 * W
  const halfBot = 0.17 * W

  // handles
  ctx.strokeStyle = darken(body, 0.12)
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.11 * W, topY + 4)
    ctx.quadraticCurveTo(cx + s * 0.14 * W, 0.28 * H, cx + s * 0.05 * W, 0.27 * H)
    ctx.stroke()
  }
  // body
  ctx.beginPath()
  ctx.moveTo(cx - halfTop, topY)
  ctx.lineTo(cx + halfTop, topY)
  ctx.lineTo(cx + halfBot, botY)
  ctx.lineTo(cx - halfBot, botY)
  ctx.closePath()
  ctx.fillStyle = shade(ctx, cx - halfTop, topY, cx + halfTop, botY, lighten(body, 0.12), darken(body, 0.08))
  ctx.fill()
  // top seam
  ctx.fillStyle = darken(body, 0.1)
  ctx.fillRect(cx - halfTop, topY, halfTop * 2, 0.015 * H)
  // stitch line
  ctx.strokeStyle = lighten(body, 0.22)
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1.4
  ctx.strokeRect(cx - halfBot * 0.9, topY + 0.03 * H, halfBot * 1.8, botY - topY - 0.05 * H)
  ctx.setLineDash([])
}

function drawMaryJane(ctx: CanvasRenderingContext2D, c: string[]) {
  const base = c[0] ?? '#c19a5b'
  const spot = c[2] ?? '#4a3417'
  const y = 0.56 * H
  const shoeW = 0.26 * W
  const shoeH = 0.13 * H

  for (const s of [-1, 1]) {
    const scx = W / 2 + s * 0.15 * W
    ctx.save()
    // sole
    ctx.fillStyle = '#2b2118'
    ctx.beginPath()
    ctx.ellipse(scx, y + shoeH * 0.5, shoeW * 0.52, shoeH * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
    // upper
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.moveTo(scx - shoeW * 0.5, y + shoeH * 0.42)
    ctx.quadraticCurveTo(scx - shoeW * 0.5, y - shoeH * 0.4, scx - shoeW * 0.1, y - shoeH * 0.42)
    ctx.quadraticCurveTo(scx + shoeW * 0.55, y - shoeH * 0.2, scx + shoeW * 0.5, y + shoeH * 0.4)
    ctx.closePath()
    ctx.fill()
    // leopard spots (clipped to upper)
    ctx.clip()
    ctx.fillStyle = spot
    let seed = s * 7 + 3
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    for (let i = 0; i < 22; i++) {
      const px = scx - shoeW * 0.45 + rnd() * shoeW * 0.95
      const py = y - shoeH * 0.35 + rnd() * shoeH * 0.75
      const r = 3 + rnd() * 4
      ctx.beginPath()
      ctx.ellipse(px, py, r, r * 0.7, rnd() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    // mary-jane strap
    ctx.strokeStyle = darken(base, 0.25)
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(scx - shoeW * 0.1, y - shoeH * 0.1)
    ctx.lineTo(scx + shoeW * 0.28, y - shoeH * 0.05)
    ctx.stroke()
  }
}

function drawDropEarrings(ctx: CanvasRenderingContext2D, c: string[]) {
  const gold = c[0] ?? '#c6a15a'
  for (const s of [-1, 1]) {
    const ecx = W / 2 + s * 0.09 * W
    const topY = 0.36 * H
    // hook
    ctx.strokeStyle = darken(gold, 0.1)
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(ecx, topY, 0.02 * W, Math.PI * 0.2, Math.PI * 1.5)
    ctx.stroke()
    // disc
    const dy = topY + 0.11 * H
    const rg = ctx.createRadialGradient(ecx - 6, dy - 8, 4, ecx, dy, 0.06 * W)
    rg.addColorStop(0, lighten(gold, 0.4))
    rg.addColorStop(1, darken(gold, 0.15))
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(ecx, dy, 0.06 * W, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = darken(gold, 0.25)
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawSunglasses(ctx: CanvasRenderingContext2D, c: string[]) {
  const frame = c[0] ?? '#4a2f1e'
  const lens = c[1] ?? '#7a5a3a'
  const cy = 0.46 * H
  const lensW = 0.19 * W
  const lensH = 0.15 * H
  const gap = 0.03 * W
  // bridge
  ctx.strokeStyle = frame
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(W / 2 - gap, cy - lensH * 0.3)
  ctx.lineTo(W / 2 + gap, cy - lensH * 0.3)
  ctx.stroke()
  for (const s of [-1, 1]) {
    const lx = W / 2 + s * (gap + lensW * 0.55)
    // arm
    ctx.strokeStyle = frame
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(lx + s * lensW * 0.5, cy - lensH * 0.2)
    ctx.lineTo(lx + s * lensW * 0.95, cy - lensH * 0.5)
    ctx.stroke()
    // lens
    const g = ctx.createLinearGradient(lx, cy - lensH * 0.5, lx, cy + lensH * 0.5)
    g.addColorStop(0, lighten(lens, 0.25))
    g.addColorStop(1, darken(lens, 0.2))
    ctx.fillStyle = g
    roundRect(ctx, lx - lensW * 0.5, cy - lensH * 0.5, lensW, lensH, 14)
    ctx.fill()
    ctx.strokeStyle = frame
    ctx.lineWidth = 9
    ctx.stroke()
  }
}

function drawSimpleTop(ctx: CanvasRenderingContext2D, c: string[]) {
  const body = c[0] ?? '#8a7a68'
  const cx = W / 2
  ctx.fillStyle = shade(ctx, cx, 0.3 * H, cx, 0.66 * H, lighten(body, 0.1), darken(body, 0.06))
  ctx.beginPath()
  ctx.moveTo(cx - 0.2 * W, 0.3 * H)
  ctx.lineTo(cx + 0.2 * W, 0.3 * H)
  ctx.lineTo(cx + 0.22 * W, 0.64 * H)
  ctx.lineTo(cx - 0.22 * W, 0.64 * H)
  ctx.closePath()
  ctx.fill()
}

function drawDress(ctx: CanvasRenderingContext2D, c: string[]) {
  const body = c[0] ?? '#6a3b3a'
  const cx = W / 2
  ctx.fillStyle = shade(ctx, cx, 0.28 * H, cx, 0.8 * H, lighten(body, 0.1), darken(body, 0.08))
  ctx.beginPath()
  ctx.moveTo(cx - 0.16 * W, 0.28 * H)
  ctx.lineTo(cx + 0.16 * W, 0.28 * H)
  ctx.lineTo(cx + 0.26 * W, 0.8 * H)
  ctx.lineTo(cx - 0.26 * W, 0.8 * H)
  ctx.closePath()
  ctx.fill()
}

const DISPATCH: Record<ShapeKey, (ctx: CanvasRenderingContext2D, c: string[]) => void> = {
  'polo-knit': drawPoloKnit,
  'wrap-cardigan': drawWrapCardigan,
  'wide-jeans': (ctx, c) => drawTrousers(ctx, c, true),
  'wide-trousers': (ctx, c) => drawTrousers(ctx, c, false),
  'wool-coat': drawWoolCoat,
  'tote-bag': drawToteBag,
  'mary-jane': drawMaryJane,
  'drop-earrings': drawDropEarrings,
  sunglasses: drawSunglasses,
  tee: drawSimpleTop,
  dress: drawDress,
  skirt: (ctx, c) => drawTrousers(ctx, c, false),
}

function render(shape: ShapeKey, colors: string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = STUDIO_BG
  ctx.fillRect(0, 0, W, H)
  ctx.lineJoin = 'round'
  DISPATCH[shape](ctx, colors)
  return canvas
}

/** Render a garment's "original" product photo to a Blob (PNG). */
export async function illustrateToBlob(shape: ShapeKey, colors: string[]): Promise<Blob> {
  const canvas = render(shape, colors)
  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

/** Same photo as a data-URI — for embedding in mock receipt HTML. */
export function illustrateToDataUrl(shape: ShapeKey, colors: string[]): string {
  return render(shape, colors).toDataURL('image/png')
}
