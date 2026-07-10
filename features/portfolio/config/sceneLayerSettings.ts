import { assetNames } from "./assetNames";

export type SceneMeshLayerFix = {
  id: string;
  runtimeName: string;
  blenderName?: string;
  /** Local-space nudge — more negative Z pulls toward the scroll camera in this scene. */
  positionOffset?: { x?: number; y?: number; z?: number };
  renderOrder?: number;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
};

export const sceneLayerSettings = {
  /**
   * Static scene boards that overlap the scroll-car path need a slight
   * camera-ward nudge so they stay visually in front of the moving car.
   */
  meshLayerFixes: [
    {
      id: "sheikhZayedRoadBoard",
      runtimeName: assetNames.metro.stationRight,
      blenderName: "sheikhzayedroade11.001",
      positionOffset: { z: -0.5 },
      renderOrder: 8,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    },
  ] satisfies SceneMeshLayerFix[],
} as const;
