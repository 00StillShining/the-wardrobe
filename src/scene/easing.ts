/**
 * The app's two easing curves, exactly as specced.
 * Camera + all 3D choreography: cubic-bezier(0.22, 1, 0.36, 1)
 * 2D UI lives in CSS (tokens.css) and never uses this module.
 */

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  // Newton-Raphson solve for t given x, then evaluate y.
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (x: number): number => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x
      const d = sampleDX(t)
      if (Math.abs(err) < 1e-5 || d === 0) break
      t -= err / d
    }
    return ((ay * t + by) * t + cy) * t
  }
}

export const easeCamera = cubicBezier(0.22, 1, 0.36, 1)

/**
 * Overshoot profile for physical things that settle (doors, drawers, key).
 * Rises to `1 + amount` on the camera curve, then eases back to exactly 1.
 * k in [0,1] → value in [0, 1+amount] → 1.
 */
export function settle(k: number, amount = 0.035, apex = 0.82): number {
  if (k <= 0) return 0
  if (k >= 1) return 1
  if (k < apex) return easeCamera(k / apex) * (1 + amount)
  const back = (k - apex) / (1 - apex)
  return 1 + amount * (1 - easeCamera(back))
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
