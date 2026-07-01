import { assetNames } from "./assetNames";

export const campfireSmokeSettings = {
  objectName: assetNames.campfire.object,
  blenderObjectName: assetNames.campfire.blenderName,
  objectMaterial: "campfire",
  /**
   * World-space emitter from `campfire.001` in Modelv1.glb.
   * Used only when the mesh cannot be resolved at runtime.
   */
  fallbackWorldPosition: [-122.334, 2.35, 8.237] as const,
  text: "10Turtle",
  textCanvasSize: [512, 192] as const,
  textSampleGap: 3,
  textWidth: 4.8,
  textHeight: 1.05,
  textLift: 0.18,
  textRise: 2.1,
  textStartScale: 0.32,
  textEndScale: 1.08,
  textDepth: 0.08,
  cycleDuration: 2.9,
  cyclePause: 0.3,
  cycleStagger: 0.12,
  particleCount: 720,
  maxOpacity: 0.22,
  minSize: 0.58,
  maxSize: 1.05,
  plumeParticleCount: 72,
  plumeMaxOpacity: 0.28,
  plumeMinSize: 0.42,
  plumeMaxSize: 1.18,
  plumeRiseSpeed: [0.22, 0.44] as const,
  plumeDriftSpeed: 0.09,
  plumeLifetime: [1.8, 3.1] as const,
  plumeSpread: 0.16,
  driftSpeed: 0.01,
  emitYOffset: 0.15,
  emitSpread: 0.03,
} as const;
