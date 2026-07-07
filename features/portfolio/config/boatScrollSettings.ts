import { assetNames } from "./assetNames";

export const boatScrollSettings = {
  boat: assetNames.boat.object,
  boatBlender: assetNames.boat.blenderName,
  /** Scene 2 panel (boat route) — NOT the unified continuefloor diorama. */
  scene2Floor: assetNames.scenes.floor1,
  scene2FloorBlender: assetNames.scenes.floor1Blender,
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
