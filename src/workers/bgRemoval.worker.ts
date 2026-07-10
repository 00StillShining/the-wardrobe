/// <reference lib="webworker" />
/**
 * Background-removal worker. Keys the uniform studio ground out of a product
 * photo and extracts the garment palette from the same ImageData pass — one
 * decode, no main-thread jank. Runs off the known-background keyer by default;
 * a real ML path can be dynamically imported here later behind the same
 * message protocol without touching callers.
 */

export interface BgRemovalRequest {
  id: string
  blob: Blob
  /** background hex to key; if omitted, sampled from the top-left pixel */
  bg?: string
}
export interface BgRemovalResponse {
  id: string
  cutout?: Blob
  palette?: string[]
  error?: string
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')

/** Chroma-key the background; feathered edges via a distance ramp. */
function keyBackground(data: Uint8ClampedArray, bg: [number, number, number]) {
  const [br, bg_, bb] = bg
  const near = 26
  const far = 64
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.max(Math.abs(data[i] - br), Math.abs(data[i + 1] - bg_), Math.abs(data[i + 2] - bb))
    let a: number
    if (d <= near) a = 0
    else if (d >= far) a = 255
    else a = Math.round(((d - near) / (far - near)) * 255)
    data[i + 3] = a
  }
}

/** Dominant garment colours from the opaque pixels of the cutout. */
function extractPalette(data: Uint8ClampedArray): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; s: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const e = buckets.get(key)
    if (e) {
      e.n++
      e.r += r
      e.g += g
      e.b += b
    } else buckets.set(key, { n: 1, r, g, b, s: sat })
  }
  const list = [...buckets.values()]
    .map((e) => ({ n: e.n, r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n), s: e.s }))
    .sort((a, b) => b.n - a.n)
  // dominant first (drives tint), then a few varied accents by descending count
  const out: string[] = []
  for (const e of list) {
    const hex = toHex(e.r, e.g, e.b)
    // skip near-duplicates
    if (out.some((o) => Math.abs(parseInt(o.slice(1, 3), 16) - e.r) < 24 && Math.abs(parseInt(o.slice(3, 5), 16) - e.g) < 24 && Math.abs(parseInt(o.slice(5, 7), 16) - e.b) < 24)) continue
    out.push(hex)
    if (out.length >= 5) break
  }
  return out.length ? out : ['#8a7a68']
}

ctx.onmessage = async (ev: MessageEvent<BgRemovalRequest>) => {
  const { id, blob, bg } = ev.data
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const c = canvas.getContext('2d')!
    c.drawImage(bitmap, 0, 0)
    bitmap.close()
    const img = c.getImageData(0, 0, canvas.width, canvas.height)
    const bgRgb = bg ? hexToRgb(bg) : ([img.data[0], img.data[1], img.data[2]] as [number, number, number])
    keyBackground(img.data, bgRgb)
    const palette = extractPalette(img.data)
    c.putImageData(img, 0, 0)
    const cutout = await canvas.convertToBlob({ type: 'image/png' })
    const res: BgRemovalResponse = { id, cutout, palette }
    ctx.postMessage(res)
  } catch (e) {
    const res: BgRemovalResponse = { id, error: String(e) }
    ctx.postMessage(res)
  }
}
