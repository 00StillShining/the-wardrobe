import type { SheetElement } from '../data/types'

/**
 * Flatten a style sheet to a 2× PNG by drawing every element onto a canvas —
 * the same layout maths the editor uses, so the export matches the canvas
 * exactly. No html-to-image (which is finicky with blob: URLs, fonts and can
 * hang); this is deterministic and offline.
 */

const W = 2000
const H = 1500
// 2× of the editor's BASE sizes (cutout 240, image 280, swatch 88, caption 30)
const BASE = { cutout: 480, image: 560, swatch: 176, caption: 60 }

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** `urls` maps element id → image object URL (for cutout / image kinds). */
export async function renderSheetToBlob(elements: SheetElement[], urls: Record<string, string>): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // linen ground
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H)
  g.addColorStop(0, '#fbf8f1')
  g.addColorStop(1, '#f1ece0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // preload the raster elements
  const imgs = new Map<string, HTMLImageElement>()
  await Promise.all(
    elements
      .filter((e) => (e.kind === 'cutout' || e.kind === 'image') && urls[e.id])
      .map(async (e) => {
        try {
          imgs.set(e.id, await loadImg(urls[e.id]))
        } catch {
          /* skip a broken image */
        }
      }),
  )

  for (const el of [...elements].sort((a, b) => a.z - b.z)) {
    ctx.save()
    ctx.translate(el.x * W, el.y * H)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.scale(el.scale, el.scale)

    if (el.kind === 'cutout' || el.kind === 'image') {
      const img = imgs.get(el.id)
      if (img && img.naturalWidth) {
        const w = el.kind === 'cutout' ? BASE.cutout : BASE.image
        const h = w * (img.naturalHeight / img.naturalWidth)
        ctx.shadowColor = 'rgba(20,14,6,0.26)'
        ctx.shadowBlur = 30
        ctx.shadowOffsetY = 20
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      }
    } else if (el.kind === 'swatch') {
      const s = BASE.swatch
      ctx.shadowColor = 'rgba(20,14,6,0.5)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 8
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, -s / 2 - 6, -s / 2 - 6, s + 12, s + 12, 4)
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = el.color ?? '#8a7a68'
      roundRect(ctx, -s / 2, -s / 2, s, s, 3)
      ctx.fill()
    } else if (el.kind === 'caption') {
      ctx.fillStyle = '#2b2620'
      ctx.font = `italic 550 ${BASE.caption}px "Fraunces Variable", Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(el.text ?? '', 0, 0)
    }
    ctx.restore()
  }

  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}
