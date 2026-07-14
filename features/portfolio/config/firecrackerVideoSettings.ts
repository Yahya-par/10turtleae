import { assetNames } from "./assetNames";

/**
 * Firecracker sky — edit this file, save, hot-reload.
 *
 * DEPTH (behind buildings, in front of night backdrop):
 *   depthTest: true  — buildings occlude fireworks
 *   z / skyDepthZ    — larger z = deeper into the scene (toward backdrop)
 *                     smaller / more negative z = closer to camera
 *
 * MANUAL POSITION (world units) — preferred for fine control:
 *   Set marinaManualPosition / blueWatersManualPosition to { x, y, z }.
 *   When set, anchor + nudge are ignored for that scene.
 *   Check console `[FirecrackerVideoOverlay] Ready` for current position.
 *
 *   x = left (−) / right (+) along the strip
 *   y = down (−) / up (+)
 *   z = toward camera (−) / toward backdrop (+)
 *
 * OR nudge the auto-anchor with marinaWorldNudge / blueWatersWorldNudge [x,y,z].
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

  maxScrollProgress: 0.145,
  marinaScrollWindow: { scrollStart: 0.13, scrollEnd: 0.05 },
  blueWatersScrollWindow: { scrollStart: 0.055, scrollEnd: 0.005 },
  scrollWindowPadding: 0.012,

  /**
   * Fine nudge after auto-anchor (ignored when manualPosition is set).
   * Try z +0.5…+2.0 to push toward the backdrop / behind buildings.
   */
  marinaWorldNudge: [0, 0, 50] as const,
  blueWatersWorldNudge: [0, 0, 1.2] as const,

  /**
   * Exact world xyz — set these to lock placement.
   * Example: { x: -160, y: 9.5, z: -4.5 }
   * Leave null to use anchor + worldNudge.
   */
  marinaManualPosition: null as { x: number; y: number; z: number } | null,
  blueWatersManualPosition: null as { x: number; y: number; z: number } | null,

  /** Height above anchor surface when not using manualPosition. */
  skyOffsetY: 4.2,
  /**
   * Added to anchor Z. Positive = toward backdrop (behind buildings when camera faces +Z).
   */
  skyDepthZ: 1.1,

  /** With depthTest, keep low so sorting still respects Z. */
  renderOrder: 3,
  /** true = hide behind building meshes, show in front of distant backdrop. */
  depthTest: true,

  planeWidth: 14,
  planeHeight: 6.2,
  canvasSize: [960, 428] as const,

  text: "10Turtle",
  textSampleGap: 4,
  textFontFamily: 'Arial, "Helvetica Neue", sans-serif',
  textFontWeight: 800,
  textLetterSpacing: 12,
  textStrokeWidth: 2,
  textBandTop: 0.28,
  textBandHeight: 0.22,
  textFontScale: 0.72,

  cycleDuration: 12,
  launchDuration: 3.2,
  rocketCount: 12,
  textRevealStart: 3.9,
  textRevealDuration: 2.4,
  letterStagger: 0.14,
  glyphSparkCount: 560,
  textHoldDuration: 2.0,
  textFadeDuration: 1.6,
  holdDuration: 4.2,

  maxParticles: 800,
  burstSparks: 56,
  burstGravity: 280,
  burstDrag: 0.986,
  textPinSize: 1.35,
} as const;
