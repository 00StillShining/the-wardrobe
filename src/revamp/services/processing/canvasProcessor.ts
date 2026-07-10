import type { ImageProcessingService, ProcessedImages } from '../contracts'
import { AppError } from '../errors'

/**
 * Browser-canvas ImageProcessingService (plan §10.6 client adapter).
 *
 * Real pipeline over real pixels: EXIF-aware decode, uniform-background
 * detection from corner patches, feathered chroma-distance keying, bounding
 * crop, WebP derivatives and palette extraction. It reports keyConfidence
 * honestly — the review step owns the keep-original fallback. A server or
 * ML adapter can replace this behind the same contract (decision D-05).
 */

const DISPLAY_MAX = 1600
const THUMB_MAX = 320
const PROCESSING_VERSION = 1

interface Rgb {
  r: number
  g: number
  b: number
}

function dist(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function cornerMean(d: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, size: number): Rgb {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = y0; y < y0 + size && y < h; y++) {
    for (let x = x0; x < x0 + size && x < w; x++) {
      const i = (y * w + x) * 4
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
      n++
    }
  }
  return { r: r / n, g: g / n, b: b / n }
}

function canvasOf(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new AppError('unknown', 'Canvas 2D context unavailable')
  return { canvas, ctx }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new AppError('unknown', `Encoding ${type} failed`))),
      type,
      quality,
    )
  })
}

function scaled(bitmap: ImageBitmap, max: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const { canvas, ctx } = canvasOf(w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { canvas, ctx }
}

export class CanvasImageProcessor implements ImageProcessingService {
  async process(original: Blob): Promise<ProcessedImages> {
    let bitmap: ImageBitmap
    try {
      // 'from-image' applies EXIF orientation during decode
      bitmap = await createImageBitmap(original, { imageOrientation: 'from-image' })
    } catch {
      throw new AppError('validation', 'The file could not be decoded as an image')
    }

    const { canvas, ctx } = scaled(bitmap, DISPLAY_MAX)
    bitmap.close()
    const w = canvas.width
    const h = canvas.height
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data

    // —— background model from the four corners ——
    const patch = Math.max(6, Math.round(Math.min(w, h) * 0.05))
    const corners = [
      cornerMean(d, w, h, 0, 0, patch),
      cornerMean(d, w, h, w - patch, 0, patch),
      cornerMean(d, w, h, 0, h - patch, patch),
      cornerMean(d, w, h, w - patch, h - patch, patch),
    ]
    const bg: Rgb = {
      r: (corners[0].r + corners[1].r + corners[2].r + corners[3].r) / 4,
      g: (corners[0].g + corners[1].g + corners[2].g + corners[3].g) / 4,
      b: (corners[0].b + corners[1].b + corners[2].b + corners[3].b) / 4,
    }
    const spread = Math.max(...corners.map((c) => dist(c, bg)))
    // corners agreeing = uniform background = keyable photo
    const uniformity = Math.max(0, 1 - spread / 90)

    const near = 26 + spread * 0.8
    const far = near + 42

    // —— feathered key ——
    for (let i = 0; i < d.length; i += 4) {
      const delta = dist({ r: d[i], g: d[i + 1], b: d[i + 2] }, bg)
      const a = delta <= near ? 0 : delta >= far ? 255 : Math.round(((delta - near) / (far - near)) * 255)
      d[i + 3] = a
    }

    // —— opaque bounding box + subject sanity ——
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    let opaque = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 128) {
          opaque++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const opaqueFrac = opaque / (w * h)
    const subjectOk = opaqueFrac > 0.04 && opaqueFrac < 0.9 && maxX > minX && maxY > minY
    const keyConfidence = subjectOk ? Math.min(1, uniformity * (opaqueFrac < 0.75 ? 1 : 0.6)) : 0

    if (!subjectOk) {
      // nothing usable was isolated — treat the whole frame as the subject
      minX = 0
      minY = 0
      maxX = w - 1
      maxY = h - 1
      for (let i = 3; i < d.length; i += 4) d[i] = 255
    }

    // —— crop with margin ——
    const margin = Math.round(Math.max(w, h) * 0.04)
    const cx = Math.max(0, minX - margin)
    const cy = Math.max(0, minY - margin)
    const cw = Math.min(w, maxX + margin + 1) - cx
    const ch = Math.min(h, maxY + margin + 1) - cy
    ctx.putImageData(img, 0, 0)
    const { canvas: cut, ctx: cutCtx } = canvasOf(cw, ch)
    cutCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch)

    // —— palette from opaque pixels (3-bit bins) ——
    const { canvas: pal, ctx: palCtx } = canvasOf(Math.min(64, cw), Math.min(64, ch))
    palCtx.drawImage(cut, 0, 0, pal.width, pal.height)
    const pd = palCtx.getImageData(0, 0, pal.width, pal.height).data
    const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
    for (let i = 0; i < pd.length; i += 4) {
      if (pd[i + 3] < 200) continue
      const key = ((pd[i] >> 5) << 6) | ((pd[i + 1] >> 5) << 3) | (pd[i + 2] >> 5)
      const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      bin.n++
      bin.r += pd[i]
      bin.g += pd[i + 1]
      bin.b += pd[i + 2]
      bins.set(key, bin)
    }
    const palette = [...bins.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 4)
      .map((bin) => {
        const hex = (v: number) => Math.round(v / bin.n).toString(16).padStart(2, '0')
        return `#${hex(bin.r)}${hex(bin.g)}${hex(bin.b)}`
      })

    // —— derivatives ——
    const cutout = await toBlob(cut, 'image/png')
    const display = await toBlob(cut, 'image/webp', 0.85)
    const tScale = Math.min(1, THUMB_MAX / Math.max(cw, ch))
    const { canvas: thumbCanvas, ctx: thumbCtx } = canvasOf(
      Math.max(1, Math.round(cw * tScale)),
      Math.max(1, Math.round(ch * tScale)),
    )
    thumbCtx.drawImage(cut, 0, 0, thumbCanvas.width, thumbCanvas.height)
    const thumb = await toBlob(thumbCanvas, 'image/webp', 0.8)

    return { cutout, display, thumb, palette, width: cw, height: ch, keyConfidence }
  }
}

export const processingVersion = PROCESSING_VERSION
export const canvasImageProcessor = new CanvasImageProcessor()
