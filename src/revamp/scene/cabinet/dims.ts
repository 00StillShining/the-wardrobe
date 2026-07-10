/** Cabinet dimensions (meters) — single source of truth, per cabinet-plan.md. */

export const CAB = {
  w: 2.2,
  h: 2.35,
  d: 0.62,
  plinthH: 0.09,
  frame: 0.06, // structural member thickness
  panel: 0.024, // door/back panel thickness

  // module widths (left → right) and their centre x
  moduleA: 0.88,
  moduleB: 0.72,
  moduleC: 0.6,

  doorOpenRad: (107 * Math.PI) / 180,
  doorDur: 1.25, // right door swing seconds; left follows +90 ms
  doorLag: 0.09,
  cameraDepartDelay: 0.25,

  drawerY: 0.28,
  drawerH: 0.14,
  drawerTravel: 0.34,
  drawerDur: 0.9,

  railY: 1.72,
  shelfYs: [0.42, 0.72, 1.02, 1.32, 1.62, 1.92],

  trayY: 0.98,
  trayW: 0.42,
  trayD: 0.34,
} as const

// derived module boundaries (outer face at ±w/2)
const innerLeft = -CAB.w / 2
export const MODULE_X = {
  aLeft: innerLeft,
  aCenter: innerLeft + CAB.moduleA / 2,
  abDivider: innerLeft + CAB.moduleA,
  bCenter: innerLeft + CAB.moduleA + CAB.moduleB / 2,
  bcDivider: innerLeft + CAB.moduleA + CAB.moduleB,
  cCenter: innerLeft + CAB.moduleA + CAB.moduleB + CAB.moduleC / 2,
  cRight: CAB.w / 2,
} as const
