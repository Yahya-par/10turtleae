import { assetNames } from "./assetNames";

/**
 * Safari sky lanterns + service banners — edit this file, save, and hot-reload to tune.
 *
 * Per-lantern position on the mountain backdrop (0–1):
 *   u = left → right
 *   v = back → front (toward camera)
 *   h = lower sky → higher sky
 *
 * `banner` sizes are world units (not scaled with the lantern mesh).
 */
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

  /** Service banner hanging below each lantern (world units). */
  banner: {
    /** Vertical banner size (stacked letters). */
    width: 0.5,
    height: 2,
    /** Horizontal banner size (single-line text). */
    horizontalWidth: 1.9,
    horizontalHeight: 0.52,
    stringLength: 0.002,
    stringRadius: 0.005,
    gapBelowLantern: 0.1,
    background: "#7B2D3B",
    backgroundDark: "#5A2230",
    textColor: "#FFF8EB",
    trimColor: "#C9A66B",
    stringColor: "#3d2814",
    textFontFamily: '"Arial Black", Arial, "Helvetica Neue", sans-serif',
    renderOrder: 100,
  },

  /**
   * u/v = position on mountain backdrop (0–1).
   * h = height within sky band (0 = lower sky, 1 = higher).
   * service = label on the hanging banner.
   * orientation = "vertical" (stacked letters) or "horizontal" (single line).
   */
  lanterns: [
    { u: 0.2, v: 0.55, h: 0.35, scale: 1.0, phase: 0, sway: 0.102, bob: 0.073, service: "UI/UX", orientation: "vertical" },
    { u: 0.38, v: 0.72, h: 0.58, scale: 1.08, phase: 1.4, sway: 0.095, bob: 0.064, service: "AI AUTOMATION", orientation: "horizontal" },
    { u: 0.55, v: 0.48, h: 0.42, scale: 0.92, phase: 2.8, sway: 0.088, bob: 0.057, service: "WEB DEV", orientation: "vertical" },
    { u: 0.72, v: 0.65, h: 0.78, scale: 1.04, phase: 4.1, sway: 0.108, bob: 0.069, service: "MOBILE APP", orientation: "horizontal" },
    { u: 0.28, v: 0.82, h: 0.9, scale: 0.96, phase: 5.5, sway: 0.079, bob: 0.054, service: "GRAPHICS & DESIGN", orientation: "horizontal" },
    { u: 0.48, v: 0.42, h: 0.22, scale: 1.12, phase: 0.9, sway: 0.101, bob: 0.072, service: "DIGITAL MARKETING", orientation: "horizontal" },
    { u: 0.84, v: 0.58, h: 0.52, scale: 0.9, phase: 3.3, sway: 0.09, bob: 0.06, service: "VIDEO & ANIMATION", orientation: "vertical" },
    { u: 0.62, v: 0.75, h: 0.68, scale: 1.0, phase: 6.2, sway: 0.097, bob: 0.066, service: "BRANDING", orientation: "vertical" },
  ],
} as const;
