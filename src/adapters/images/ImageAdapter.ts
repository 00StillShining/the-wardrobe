import type { BgRemovalRequest, BgRemovalResponse } from '../../workers/bgRemoval.worker'
import { STUDIO_BG } from '../../scene/garments/illustrate'

/**
 * Image pipeline boundary: turn an original photo into a background-removed
 * cutout + extracted palette, off the main thread. The mock uses a chroma
 * keyer (instant, offline); a real ML impl can replace the worker behind this
 * same interface.
 */
export interface ImageAdapter {
  process(original: Blob, bg?: string | null): Promise<{ cutout: Blob; palette: string[] }>
}

let worker: Worker | null = null
const pending = new Map<string, { resolve: (r: { cutout: Blob; palette: string[] }) => void; reject: (e: unknown) => void }>()
let seq = 0

function ensureWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/bgRemoval.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (ev: MessageEvent<BgRemovalResponse>) => {
    const { id, cutout, palette, error } = ev.data
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (error || !cutout || !palette) p.reject(new Error(error ?? 'bg removal failed'))
    else p.resolve({ cutout, palette })
  }
  return worker
}

export const workerImageAdapter: ImageAdapter = {
  process(original, bg = STUDIO_BG) {
    const w = ensureWorker()
    const id = `img-${++seq}`
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      const req: BgRemovalRequest = { id, blob: original, ...(bg ? { bg } : {}) }
      w.postMessage(req)
    })
  },
}
