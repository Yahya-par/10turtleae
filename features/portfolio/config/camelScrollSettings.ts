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
  /**
   * Final turtle seat offsets from boat center/top in boat local space.
   * Tune these manually to nudge seat placement.
   */
  turtleBoatSeatOffsetX: -15,
  turtleBoatSeatOffsetY: -9.55,
  turtleBoatSeatOffsetZ: 5,
} as const;
