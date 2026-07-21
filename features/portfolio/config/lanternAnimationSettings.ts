import { assetNames } from "./assetNames";

/**
 * Safari sky lanterns — edit this file, save, and hot-reload to tune.
 *
 * Per-lantern position on the mountain backdrop (0–1):
 *   u = left → right
 *   v = back → front (toward camera)
 *   h = lower sky → higher sky
 *
 * `label` is reserved for on-lantern text (applied later).
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

  flameColor: "#ffd98a",
  flameCoreColor: "#fff6dc",
  haloColor: "#ffbe6e",
  rimColor: "#4a2414",

  /** Global size multiplier applied on top of per-lantern scale. */
  sizeScale: 0.6,
  bodyHeight: 0.78,
  /** Stretch local mesh — keep near 1:1 so the barrel silhouette holds. */
  heightScale: 1,
  widthScale: 0.94,

  /** Sky band above mountain peaks (world units). */
  skyMinOffset: 0.6,
  skyMaxOffset: 4.2,

  /** ~2 = circular cross-section (avoids the paper-bag look). */
  shapeExponent: 2.15,
  radialSegments: 48,
  heightSegments: 40,
  depthScale: 1,
  sideBow: 0,

  /** Hanging text under each lantern (thread + glow text). */
  hangingLabel: {
    /** Manual control in canvas pixels. Increase/decrease as needed. */
    fontSize: 120,
    fontWeight: 500,
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    textColor: "#fff0d8",
    glowColor: "#f5c87f",
    /** Glow spread — higher = softer, more luminous letter bodies. */
    glowBlur: 1,
    /** 0–1 — lower = more see-through, blends with sky. */
    fillOpacity: 0.68,
    glowOpacity: 1.5,
    labelOpacity: 0.9,
    threadColor: "#c89850",
    threadLength: 0.28,
    threadRadius: 0.0028,
    gapBelowLantern: 0.025,
    textYOffset: 0.02,
    /** World height multiplier for all labels (same size on every lantern). */
    heightScale: 1,
  },

  /**
   * u/v = position on mountain backdrop (0–1).
   * h = height within sky band (0 = lower sky, 1 = higher).
   * label = text for the lantern body (applied later).
   */
  lanterns: [
    { u: 0.2, v: 0.55, h: 0.35, scale: 1.0, phase: 0, sway: 0.102, bob: 0.073, label: "Modern Design" },
    { u: 0.38, v: 0.72, h: 0.58, scale: 1.08, phase: 1.4, sway: 0.095, bob: 0.064, label: "Full Branding" },
    { u: 0.55, v: 0.48, h: 0.42, scale: 0.92, phase: 2.8, sway: 0.088, bob: 0.057, label: "Website Redesign" },
    { u: 0.72, v: 0.65, h: 0.78, scale: 1.04, phase: 4.1, sway: 0.108, bob: 0.069, label: "Built to Convert" },
    { u: 0.28, v: 0.82, h: 0.9, scale: 0.96, phase: 5.5, sway: 0.079, bob: 0.054, label: "Fast Delievery" },
    { u: 0.48, v: 0.42, h: 0.22, scale: 1.12, phase: 0.9, sway: 0.101, bob: 0.072, label: "Ongoing Support" },
  ],
} as const;
