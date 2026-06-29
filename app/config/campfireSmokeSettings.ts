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
  particleCount: 32,
  maxOpacity: 0.32,
  minSize: 0.55,
  maxSize: 1.1,
  riseSpeed: [0.22, 0.42] as const,
  driftSpeed: 0.08,
  lifetime: [1.6, 3.0] as const,
  emitYOffset: 0.15,
  emitSpread: 0.18,
} as const;
