import { assetNames } from "./assetNames";

/**
 * Firecracker sky text — edit this file, save, and hot-reload to tune.
 * Peony-style bursts (gold / pink / green) form "10Turtle" in the sky.
 */
export const firecrackerAnimationSettings = {
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

  text: "10Turtle",
  textCanvasSize: [720, 200] as const,
  textSampleGap: 3,
  textFontFamily: '"Arial Black", Arial, "Helvetica Neue", sans-serif',
  textFontWeight: 700,
  textLetterSpacing: 4,
  textWidth: 5.2,
  textHeight: 1.15,
  textDepth: 0.06,

  skyOffsetY: 2.9,
  skyDepthZ: -1.35,
  scrollPadding: 0.035,
  scrollFallback: { scrollStart: 0.24, scrollEnd: 0.01 },

  /** Burst-centre samples along the text outline. */
  glyphBurstCount: 380,
  /** Radiating trail sparks per burst centre. */
  trailsPerBurst: 10,
  /** Rising rocket trails from below the skyline. */
  rocketCount: 72,

  launchSpread: 1.1,
  launchHeight: -0.35,
  launchDuration: 0.65,
  burstDuration: 0.22,
  holdDuration: 2.4,
  cyclePause: 0.7,
  letterStagger: 0.13,

  burstSpeedMin: 1.6,
  burstSpeedMax: 3.4,
  burstGravity: 1.35,
  burstDrag: 0.92,
  trailLifeMin: 0.9,
  trailLifeMax: 1.75,
  willowFall: 0.55,

  rocketMinSize: 0.35,
  rocketMaxSize: 1.1,
  trailMinSize: 0.55,
  trailMaxSize: 2.2,
  coreSize: 1.45,

  renderOrder: 3,
  depthTest: true,
} as const;
