import { assetNames } from "./assetNames";

export const boatScrollSettings = {
  boat: assetNames.boat.object,
  boatBlender: assetNames.boat.blenderName,
  /** Unified diorama floor (continuefloor.001 in Modelv1). */
  scene2Floor: assetNames.scenes.continuityFloor,
  scene2FloorBlender: assetNames.scenes.continuityFloorBlender,
  carrierName: "BoatScrollCarrier001",

  /** Inset from scene 2 floor edges. */
  pathInset: 1.2,
  /** Gap east of the car where the boat docks at scene 2 exit. */
  carHandoffInset: 2.5,

  /** >1 = boat advances more gently through scene 2 scroll. */
  travelExponent: 1.45,

  /** Smooth follow toward scroll-mapped target (lower = slower). */
  followLerp: 0.14,
} as const;
