import { assetNames } from "./assetNames";

/**
 * Procedural firecracker sky — edit this file, save, and hot-reload to tune.
 * Rockets rise → peony bursts → "10Turtle" forms from sparkler particles.
 */
export const firecrackerVideoSettings = {
  alphaCutoff: 0.05,

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

  skyOffsetY: 4.2,
  skyDepthZ: -0.35,

  renderOrder: 9,
  depthTest: false,

  planeWidth: 14,
  planeHeight: 6.2,
  canvasSize: [1280, 428] as const,

  text: "UAE's #1 web & branding agency",
  /** Spacing between outline light dots (Ain Dubai style). */
  textSampleGap: 3,
  textFontFamily: 'Arial, "Helvetica Neue", sans-serif',
  textFontWeight: 800,
  /** Extra px between characters — keep at 0 for long lines. */
  textLetterSpacing: 0,
  textStrokeWidth: 2,
  /** Vertical band on the sky plane (0–1 from top). Lower = higher in the sky. */
  textBandTop: 0.12,
  textBandHeight: 0.2,
  /** Starting font scale inside the band; auto-shrinks to fit width. */
  textFontScale: 0.82,
  /** Max fraction of canvas width the full line may use (prevents edge clip). */
  textMaxWidthRatio: 0.9,

  cycleDuration: 12,
  launchDuration: 3.2,
  /** Fewer rockets → larger, cleaner peony peals like the reference. */
  rocketCount: 7,
  textRevealStart: 3.9,
  textRevealDuration: 2.4,
  letterStagger: 0.14,
  glyphSparkCount: 900,
  textHoldDuration: 2.0,
  textFadeDuration: 1.6,
  holdDuration: 4.2,

  maxParticles: 2600,
  /** Dense radial peony streaks (classic sphere burst). */
  burstSparks: 180,
  burstSpeed: 165,
  burstLifeMin: 1.05,
  burstLifeMax: 1.65,
  /** Keep low early so the sphere stays round like the reference. */
  burstGravity: 200,
  burstDrag: 0.996,
  textPinSize: 1.35,
} as const;
