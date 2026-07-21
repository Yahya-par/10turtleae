import { assetNames } from "./assetNames";

/**
 * Procedural firecracker sky — edit this file, save, and hot-reload to tune.
 * Rockets rise → colored peony bursts → sparkler text forms.
 *
 * Palettes (match reference night fireworks):
 * - gold: dense golden chrysanthemum
 * - teal: bright cyan / aqua burst
 * - goldTeal: gold near core → aqua tips
 */
export type FireworkPalette = "gold" | "teal" | "goldTeal";

export const firecrackerVideoSettings = {
  alphaCutoff: 0.05,

  /** Cycle through these for each rocket peal. */
  palettes: ["gold", "teal", "goldTeal"] as const satisfies readonly FireworkPalette[],

  marinaAnchor: {
    object: assetNames.yacht.marinaWater,
    blender: assetNames.yacht.marinaWaterBlender,
    pattern: /water\.?002/i,
    floor: assetNames.scenes.floor10,
    floorBlender: assetNames.scenes.floor10Blender,
    floorPattern: /Desert_Scene_Floor0*10|Desert_Scene_Floor\.010/i,
  },

  blueWatersAnchor: {
    object: assetNames.yacht.mgrWater,
    blender: assetNames.yacht.mgrWaterBlender,
    pattern: /mgrwater/i,
    floor: assetNames.scenes.floor11,
    floorBlender: assetNames.scenes.floor11Blender,
    floorPattern: /Desert_Scene_Floor0*11|Desert_Scene_Floor\.011/i,
    extras: [assetNames.lastScene.ain, assetNames.lastScene.ainDubaiLegs] as const,
    extraPatterns: [/^ain$/i, /aindubai/i] as const,
  },

  /**
   * Only Dubai Marina + Blue Waters (not safari / mosque).
   * Never show above `maxScrollProgress` (blocks safari / earlier panels).
   */
  maxScrollProgress: 0.145,
  marinaScrollWindow: { scrollStart: 0.13, scrollEnd: 0.05 },
  blueWatersScrollWindow: { scrollStart: 0.055, scrollEnd: 0.005 },
  /** Shrink panel-derived windows slightly so they don't bleed into neighbors. */
  scrollWindowPadding: 0.012,

  marinaWorldNudge: [0, 0, 0] as const,
  blueWatersWorldNudge: [0, 0, 0] as const,
  marinaManualPosition: null as { x: number; y: number; z: number } | null,
  blueWatersManualPosition: null as { x: number; y: number; z: number } | null,

  /** Plane center above water — keep inside camera frame (lookAt.y ≈ 6.5). */
  skyOffsetY: 5.0,
  skyDepthZ: -0.4,

  renderOrder: 9,
  depthTest: false,

  planeWidth: 11,
  /** Tall enough for rockets + peals, short enough to stay on-screen. */
  planeHeight: 5.0,
  canvasSize: [1280, 520] as const,

  text: "UAE's #1 web & branding agency",
  /** Spacing between outline light dots (Ain Dubai style). */
  textSampleGap: 3,
  textFontFamily: 'Arial, "Helvetica Neue", sans-serif',
  textFontWeight: 800,
  /** Extra px between characters — keep at 0 for long lines. */
  textLetterSpacing: 0,
  textStrokeWidth: 2,
  /** Burst / text band — keep below the top edge so peals don't clip. */
  textBandTop: 0.24,
  textBandHeight: 0.22,
  /** Starting font scale inside the band; auto-shrinks to fit width. */
  textFontScale: 0.82,
  /** Max fraction of canvas width the full line may use (prevents edge clip). */
  textMaxWidthRatio: 0.88,

  /**
   * Rockets launch from this canvas Y fraction (0 = top).
   * Mid-lower sky — above water, still fully on screen.
   */
  rocketLaunchY: 0.86,
  /** Kill falling sparks below this fraction so they don't rain onto the water. */
  sparkFloorY: 0.94,
  /** Inset from canvas edges — sparks die if they leave this pad. */
  sparkEdgePad: 0.04,

  cycleDuration: 5,
  /** How long the launch window lasts (rockets stagger within this). */
  launchDuration: 5,
  /** Multiplier on rocket rise speed (1 ≈ 0.4s climb; higher = faster). */
  rocketSpeedScale: 1.45,
  /** Fewer rockets → larger, cleaner peony peals like the reference. */
  rocketCount: 25,
  textRevealStart: 0.7,
  textRevealDuration: 2.2,
  letterStagger: 0.14,
  glyphSparkCount: 900,
  textHoldDuration: 2.0,
  textFadeDuration: 1.6,
  holdDuration: 3,

  maxParticles: 3600,
  /** Dense radial peony streaks (classic chrysanthemum sphere). */
  burstSparks: 180,
  /** Keep peal radius inside the plane (lower = less edge clip). */
  burstSpeed: 260,
  burstLifeMin: 0.85,
  burstLifeMax: 1.35,
  /** Soft droop after the sphere forms. */
  burstGravity: 210,
  burstDrag: 0.988,
  /** Brief flash at detonation — keep small so it doesn't look like a cloud. */
  burstCoreLife: 0.18,
  burstCoreRadius: 11,
  textPinSize: 1.35,
} as const;
