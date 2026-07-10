import { assetNames } from "./assetNames";

/**
 * Lahbab camel tuning (seat offsets, walk swing, etc.).
 * Save this file to preview changes — HMR reloads the safari camel rigs.
 * You must be at the Lahbab scene with the turtle on the camel to see seat tweaks.
 */
export const endCamelScrollSettings = {
  body: "camel002",
  bodyBlender: "camel.002",
  carrierName: "SafariCamelScrollCarrier001",
  sceneFloor: assetNames.scenes.safariFloor,
  sceneFloorBlender: assetNames.scenes.safariFloorBlender,

  leftLegs: ["forwardleg005", "forwardleg006"] as const,
  leftLegsBlender: ["forwardleg.005", "forwardleg.006"] as const,
  rightLegs: ["forwardleg007", "forwardleg008"] as const,
  rightLegsBlender: ["forwardleg.007", "forwardleg.008"] as const,
  legs: [
    "forwardleg005",
    "forwardleg006",
    "forwardleg007",
    "forwardleg008",
  ] as const,
  legsBlender: [
    "forwardleg.005",
    "forwardleg.006",
    "forwardleg.007",
    "forwardleg.008",
  ] as const,

  startInset: 1.2,
  endInset: 1.2,

  turtleSeatOffsetX: 0.4,
  turtleSeatOffsetY: -0.35,
  turtleSeatOffsetZ: 0,
  /** Safari camel carrier + mesh draw order. */
  carrierRenderOrder: 12,
  /** Draw turtle above the safari camel — must be greater than carrierRenderOrder. */
  turtleRenderOrder: 13,
  /** Saddle blanket height as a fraction of camel body height. */
  saddleHeightFactor: 0.54,
  /** Shift seat aft of bbox center (hump sits behind the mesh midpoint). */
  saddleOffsetXFactor: -0.1,

  transferArcHeight: 0.9,
  transferDuration: 1.85,
  reverseTransferScrollHold: 0.15,

  swingSpeed: 2.4,
  swingAngle: 0.32,
  swingAxis: "z" as "x" | "y" | "z",
  rightPhaseOffset: Math.PI,
  bodyRockAngle: 0.04,
  walkCyclesPerScene: 8,
  scrollIdleThreshold: 0.00004,
} as const;
