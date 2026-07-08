export const droneAnimationSettings = {
  /** Drone object to animate (runtime + Blender aliases). */
  droneName: "drone001",
  droneBlenderName: "drone.001",

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
