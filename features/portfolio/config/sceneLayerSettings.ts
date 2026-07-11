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

/** Runtime nudge for inlanddunes001 — edit x / y / z and save to preview. */
export const inlandDunesPositionOffset = {
  x: 0,
  y: 0,
  z: 1,
} as const;

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
    {
      id: "inlandDunes",
      runtimeName: assetNames.dunes.inland,
      blenderName: assetNames.dunes.inlandBlender,
      positionOffset: inlandDunesPositionOffset,
    },
  ] satisfies SceneMeshLayerFix[],
} as const;
