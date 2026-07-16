export const droneAnimationSettings = {
  /** Drone object to animate (runtime + Blender aliases). */
  // New asset name (Blender: dronewithbanner.001)
  droneName: "dronewithbanner001",
  droneBlenderName: "dronewithbanner.001",
  /**
   * Backward-compatible aliases (older drone exports).
   * Keep these so the animation still works if a different GLB is loaded.
   */
  droneAliases: ["drone001", "drone.001"] as const,

  /** Road object where the drone should arrive before looping. */
  roadName: "ROAD001",
  roadBlenderName: "Road.001",

  /** Parent carrier name used to move the drone non-destructively. */
  carrierName: "DroneScrollCarrier001",

  /**
   * Manual speed controls:
   * finalSpeed = baseSpeed * speedMultiplier
   * - reduce `speedMultiplier` to slow down
   * - increase `speedMultiplier` to speed up
   */
  baseSpeed: 3,
  speedMultiplier: 0.5,

  /**
   * Minimum X gap to keep drone starting point to the right of ROAD001.
   * Increase if you want a longer travel distance before each loop.
   */
  startGapFromRoad: 26,
} as const;

export function getDroneSpeed() {
  return droneAnimationSettings.baseSpeed * droneAnimationSettings.speedMultiplier;
}
