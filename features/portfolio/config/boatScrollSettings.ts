import { assetNames } from "./assetNames";

export const boatScrollSettings = {
  boat: assetNames.boat.object,
  boatBlender: assetNames.boat.blenderName,
  scene2Floor: assetNames.scenes.floor1,
  carrierName: "BoatScrollCarrier001",

  /** Inset from scene 2 floor edges. */
  pathInset: 1.2,

  /** >1 = boat advances more gently through scene 2 scroll. */
  travelExponent: 1.45,

  /** Smooth follow toward scroll-mapped target (lower = slower). */
  followLerp: 0.14,
} as const;
