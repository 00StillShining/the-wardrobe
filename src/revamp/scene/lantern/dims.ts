/** The Lantern — dimensions (meters). Single source of truth, per scene-v2-lantern.md. */

export const LAN = {
  w: 2.4,
  h: 2.3,
  d: 0.65,
  shell: 0.045, // case wall thickness
  brassEdge: 0.012,
  floatGap: 0.035, // shadow gap under the case
  baseH: 0.09, // recessed dark base below the gap

  // modules (left → right): A double linen doors, B open bay, C cane slide
  aW: 1.1,
  bW: 0.75,
  cW: 0.55,

  doorSlide: 0.56, // right linen leaf glides over the left
  doorDur: 1.3,
  doorLag: 0.09,
  caneSlide: 0.5,
  caneDur: 1.1,
  caneLag: 0.32,
  cameraDepartDelay: 0.25,
  glowRamp: 0.65,

  railY: 1.62,
  drawerY: 0.055,
  drawerH: 0.08,
  drawerTravel: 0.62,
  drawerDur: 1.1,

  mirrorX: -1.85,
  trayX: 1.62,
  trayY: 1.05,
} as const

const left = -LAN.w / 2
export const MOD = {
  aLeft: left,
  aRight: left + LAN.aW,
  aCenter: left + LAN.aW / 2,
  bLeft: left + LAN.aW,
  bRight: left + LAN.aW + LAN.bW,
  bCenter: left + LAN.aW + LAN.bW / 2,
  cLeft: left + LAN.aW + LAN.bW,
  cRight: LAN.w / 2,
  cCenter: left + LAN.aW + LAN.bW + LAN.cW / 2,
} as const
