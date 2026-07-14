import { assetNames } from "./assetNames";

/**
 * Procedural firecracker sky — edit this file, save, and hot-reload to tune.
 * Rockets rise → peony bursts → "10Turtle" forms from sparkler particles.
 */
export const firecrackerVideoSettings = {
  alphaCutoff: 0.03,

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
  canvasSize: [960, 428] as const,

  text: "10Turtle",
  /** Spacing between outline light dots (Ain Dubai style). */
  textSampleGap: 4,
  textFontFamily: 'Arial, "Helvetica Neue", sans-serif',
  textFontWeight: 800,
  textLetterSpacing: 12,
  textStrokeWidth: 2,
  /** Vertical band on the sky plane (0–1). Lower = smaller text. */
  textBandTop: 0.28,
  textBandHeight: 0.22,
  /** Extra scale for font size inside the band (1 = fill the band). */
  textFontScale: 0.72,

  cycleDuration: 12,
  launchDuration: 3.2,
  rocketCount: 12,
  textRevealStart: 3.9,
  textRevealDuration: 2.4,
  letterStagger: 0.14,
  glyphSparkCount: 560,
  /** How long fully-formed text stays before fading out. */
  textHoldDuration: 2.0,
  /** Fade-out length — text clears with the fireworks. */
  textFadeDuration: 1.6,
  holdDuration: 4.2,

  maxParticles: 800,
  burstSparks: 56,
  burstGravity: 280,
  burstDrag: 0.986,
  textPinSize: 1.35,
} as const;
