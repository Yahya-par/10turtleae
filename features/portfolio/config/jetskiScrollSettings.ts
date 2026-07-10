import { assetNames } from "./assetNames";

export const jetskiScrollSettings = {
  driver: assetNames.jetski.driver,
  driverBlender: assetNames.jetski.driverBlender,
  jetski: assetNames.jetski.object,
  jetskiBlender: assetNames.jetski.blenderName,
  carrierName: "JetskiScrollCarrier001",
  /** Global lock for the moving jetski carrier (kept false; jetski001 is frozen separately in JetskiScrollMovement). */
  lockToModelPosition: false,

  sceneFloor: assetNames.scenes.alRab,
  sceneFloorBlender: "Desert_Scene_Floor.005",
  /** Al Arab scene water001 — sole reference for jetski start/end. */
  water: assetNames.jetski.water,
  waterBlender: assetNames.jetski.waterBlender,

  pathInset: 1.2,
  /** Inset from the eastern water edge for the jetski start line (larger = starts further inside the water). */
  startInset: 1.6,
  /** Inset from the western water edge for the jetski stop line (larger = stops further inside the water). */
  endInset: 1.6,
  /** Extra nudge on the stop X (negative = stop slightly earlier). */
  trackEndOffsetX: 0,
  /** When handing off to yacht, snap dock X to full track end at or above this progress. */
  handoffSnapEndProgress: 0.94,
  /** Extra nudge on the whole jetski carrier (x/y/z). */
  carrierOffset: { x: 0, y: 0, z: 0 },

  travelExponent: 1.4,
  followLerp: 0.1,

  transferArcHeight: 0.9,
  transferDuration: 1.85,
  reverseTransferScrollHold: 0.15,

  turtleSeatOffsetX: 0.7,
  turtleSeatOffsetY: 0.05,
  turtleSeatOffsetZ: 0.2,
  turtleSeatHeightFactor: 0.55,
} as const;
