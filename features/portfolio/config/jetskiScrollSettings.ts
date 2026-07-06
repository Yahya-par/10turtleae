import { assetNames } from "./assetNames";

export const jetskiScrollSettings = {
  driver: assetNames.jetski.driver,
  driverBlender: assetNames.jetski.driverBlender,
  jetski: assetNames.jetski.object,
  jetskiBlender: assetNames.jetski.blenderName,
  carrierName: "JetskiScrollCarrier001",

  sceneFloor: assetNames.scenes.alRab,
  sceneFloorBlender: "Desert_Scene_Floor.005",

  pathInset: 1.2,
  /** Extra nudge on the stop X (negative = stop slightly earlier). */
  trackEndOffsetX: 0,
  /** Extra nudge on the whole jetski carrier (x/y/z). */
  carrierOffset: { x: 0, y: 0, z: 0 },

  travelExponent: 1.4,
  followLerp: 0.1,

  transferArcHeight: 0.9,
  transferDuration: 1.85,
  reverseTransferScrollHold: 0.15,

  turtleSeatOffsetX: 0.7,
  turtleSeatOffsetY: 0.05,
  turtleSeatOffsetZ: 0.08,
  turtleSeatHeightFactor: 0.55,
} as const;
