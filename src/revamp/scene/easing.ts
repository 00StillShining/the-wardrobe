/**
 * The app's single 3D easing curve and settle profile — ported behavior from
 * the v1 rig (src/scene/easing.ts), which is the motion reference (plan §12.1).
 */

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Newton-Raphson cubic-bezier(0.22, 1, 0.36, 1) — never linear, never bouncy. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number): number => {
    const target = clamp01(x)
    let t = target
    for (let i = 0; i < 5; i++) {
      const err = sampleX(t) - target
      if (Math.abs(err) < 1e-5) break
      const d = sampleDX(t)
      if (Math.abs(d) < 1e-6) break
      t -= err / d
    }
    return sampleY(clamp01(t))
  }
}

export const easeCamera = cubicBezier(0.22, 1, 0.36, 1)

/**
 * Physical settle: rise on the camera curve, overshoot by `amount` at `apex`,
 * ease back to exactly 1. Used by doors, drawer and camera arrival.
 */
export function settle(k: number, amount = 0.035, apex = 0.82): number {
  const t = clamp01(k)
  if (t <= apex) return easeCamera(t / apex) * (1 + amount)
  const back = (t - apex) / (1 - apex)
  return 1 + amount * (1 - easeCamera(back))
}
