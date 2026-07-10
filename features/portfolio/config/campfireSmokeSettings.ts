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
  /** Canvas used to rasterize the label before particles sample it. Wider = sharper last letters. */
  textCanvasSize: [640, 192] as const,
  /** Pixels between glyph sample points — lower captures small holes (like the “e” counter). */
  textSampleGap: 2,
  textFontFamily: "Arial, sans-serif",
  textFontWeight: 700,
  /** Extra canvas spacing between characters (pixels). */
  textLetterSpacing: 3,
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
  /**
   * Nudge the emitter on the trail side of the safari camel path.
   * +X = east (behind the camel when it travels west). Keep Z at 0 so smoke
   * is not buried behind the ground mesh.
   */
  emitterWorldOffset: { x: -0.3, y: -0.3, z: 0 } as const,
  /** Visible above terrain; safari camel carrier uses a higher order (see scroll movement). */
  renderOrder: 8,
  depthTest: false,
  /** Bias rising plume spawns east of the fire (trail side). */
  plumeSpawnOffsetX: 0.35,
} as const;
