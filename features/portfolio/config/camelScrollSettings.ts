import { assetNames } from "./assetNames";

export const camelScrollSettings = {
  camel: assetNames.camel.body,
  camelBlender: assetNames.camel.bodyBlender,
  turtle: assetNames.camel.turtle,
  turtleBlender: assetNames.camel.turtleBlender,
  boat: assetNames.boat.object,
  boatBlender: assetNames.boat.blenderName,
  carrierName: "CamelScrollCarrier001",
  openingFloor: assetNames.scenes.openingDesert,
  legs: assetNames.camel.legs,
  legsBlender: assetNames.camel.legsBlender,

  /** Inset from the opening desert floor edges. */
  pathInset: 1.2,

  /** Start transfer when camel is this far (X) from boat. */
  transferStartDistanceX: 4.1,
  /** Finish transfer when camel gets this close (X) to boat. */
  transferEndDistanceX: 2.8,
  transferArcHeight: 0.9,
  /** Seconds for turtle arc from camel to boat. */
  transferDuration: 1.35,
  /**
   * Cushion height as a fraction of boat height above hull bottom.
   */
  turtleBoatDeckHeightFactor: 0.34,
  /** Extra lift for mesh pivot (turtle foot lift is added automatically). */
  turtleBoatPivotLift: 0.04,
  turtleBoatSeatOffsetX: 0,
  turtleBoatSeatOffsetY: -0.7,
  turtleBoatSeatOffsetZ: 0,
  /** Safety floor so turtle never drops below waterline. */
  turtleBoatMinDeckHeightFactor: 0.3,
} as const;
