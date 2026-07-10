import { BAND, slotIndex, type LayerSlot } from './layerModel'

/**
 * Deterministic outfit cover: layers painted bottom→top into their bands on
 * a linen field (plan §9.6 cover composition). Pure canvas — no DOM snapshot.
 */

const W = 800
const H = 1000

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('cover image failed to load'))
    img.src = url
  })
}

export async function renderOutfitCover(
  layers: { url: string; layerSlot: LayerSlot }[],
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unavailable')

  ctx.fillStyle = '#ece5d5'
  ctx.fillRect(0, 0, W, H)

  const ordered = [...layers].sort((a, b) => slotIndex(a.layerSlot) - slotIndex(b.layerSlot))
  for (const layer of ordered) {
    try {
      const img = await loadImage(layer.url)
      const band = BAND[layer.layerSlot]
      const bandH = band.height * H
      const bandTop = band.top * H
      const scale = Math.min((W * 0.72) / img.width, bandH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (W - w) / 2, bandTop + (bandH - h) / 2, w, h)
    } catch {
      // a broken layer image never sinks the cover — it is simply absent
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('cover encode failed'))), 'image/webp', 0.85)
  })
}
