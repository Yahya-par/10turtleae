import { assetNames } from "./assetNames";

export const lanternAnimationSettings = {
  land: assetNames.safari.land,
  landBlender: assetNames.safari.landBlender,
  floor: assetNames.scenes.safariFloor,
  floorBlender: assetNames.scenes.safariFloorBlender,
  mountains: assetNames.safari.mountains,
  mountainsBlender: assetNames.safari.mountainsBlender,

  /** Inset from mountain backdrop edges. */
  pathInset: 0.6,

  flameColor: "#e07818",
  flameCoreColor: "#f0a830",
  haloColor: "#e86a14",
  rimColor: "#2a1006",

  /** Global size multiplier applied on top of per-lantern scale. */
  sizeScale: 0.48,
  bodyHeight: 0.76,
  /** Stretch local mesh — taller silhouette without widening. */
  heightScale: 1,
  widthScale: 0.86,

  /** Sky band above mountain peaks (world units). */
  skyMinOffset: 0.6,
  skyMaxOffset: 4.2,

  shapeExponent: 4.6,
  radialSegments: 36,
  heightSegments: 32,
  depthScale: 0.8,
  sideBow: 0.018,

  /**
   * u/v = position on mountain backdrop (0–1).
   * h = height within sky band (0 = lower sky, 1 = higher).
   */
  lanterns: [
    { u: 0.2, v: 0.55, h: 0.35, scale: 1.0, phase: 0, sway: 0.07, bob: 0.05 },
    { u: 0.38, v: 0.72, h: 0.58, scale: 1.08, phase: 1.4, sway: 0.065, bob: 0.045 },
    { u: 0.55, v: 0.48, h: 0.42, scale: 0.92, phase: 2.8, sway: 0.06, bob: 0.04 },
    { u: 0.72, v: 0.65, h: 0.78, scale: 1.04, phase: 4.1, sway: 0.075, bob: 0.048 },
    { u: 0.28, v: 0.82, h: 0.9, scale: 0.96, phase: 5.5, sway: 0.055, bob: 0.038 },
    { u: 0.48, v: 0.42, h: 0.22, scale: 1.12, phase: 0.9, sway: 0.07, bob: 0.05 },
    { u: 0.84, v: 0.58, h: 0.52, scale: 0.9, phase: 3.3, sway: 0.062, bob: 0.042 },
    { u: 0.62, v: 0.75, h: 0.68, scale: 1.0, phase: 6.2, sway: 0.068, bob: 0.046 },
  ],
} as const;
