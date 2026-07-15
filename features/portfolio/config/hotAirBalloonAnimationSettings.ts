/**
 * Hot air balloon float — edit this file, save, and hot-reload to tune.
 *
 * The balloon bobs from its lowest point up and back down in a smooth
 * loop. `riseHeight` is the full bottom→top travel in world units.
 */
export const hotAirBalloonAnimationSettings = {
  objectName: "mutedhotairballoon001",
  objectBlenderName: "mutedhotairballoon.001",
  carrierName: "HotAirBalloonCarrier001",

  /** Full vertical travel (world units) from lowest to highest point. */
  riseHeight: 3.5,
  /** Seconds for one full cycle (bottom → top → bottom). */
  cycleSeconds: 35,
  /** Gentle horizontal drift while floating (world units, 0 = none). */
  swayAmount: 0,
  /** Sway cycles relative to the rise cycle (unitless ratio). */
  swayFrequency: 2.7,
} as const;
