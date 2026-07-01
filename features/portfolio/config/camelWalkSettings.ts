import { assetNames } from "./assetNames";

export const camelWalkSettings = {
  body: assetNames.camel.body,
  bodyBlender: assetNames.camel.bodyBlender,
  turtle: assetNames.camel.turtle,
  turtleBlender: assetNames.camel.turtleBlender,
  leftLegs: [...assetNames.camel.leftLegs],
  leftLegsBlender: [...assetNames.camel.leftLegsBlender],
  rightLegs: [...assetNames.camel.rightLegs],
  rightLegsBlender: [...assetNames.camel.rightLegsBlender],

  /** Leg swing speed in cycles per second. */
  swingSpeed: 2.4,
  /** Peak swing angle in radians. */
  swingAngle: 0.32,
  /** Z axis = horizontal left/right swing in the side-view diorama. */
  swingAxis: "z" as "x" | "y" | "z",
  /** Right-side phase offset relative to left (radians). */
  rightPhaseOffset: Math.PI,
  /** Subtle body rock synced with the leg cycle. */
  bodyRockAngle: 0.04,
  /** Full leg cycles across scene 1 travel distance. */
  walkCyclesPerScene: 5,
  /** Ignore tiny scroll drift while camera settles. */
  scrollIdleThreshold: 0.00008,
};
