import { assetNames } from "./assetNames";

export const planeScrollSettings = {
  plane: assetNames.plane.object,
  planeBlender: assetNames.plane.blenderName,
  carrierName: "PlaneScrollCarrier001",

  /** Burj Al Arab coastal scene — plane animates only while this panel is active. */
  sceneStart: assetNames.scenes.alRab,
  sceneStartBlender: "Desert_Scene_Floor.005",
  sceneEnd: assetNames.scenes.alRab,
  sceneEndBlender: "Desert_Scene_Floor.005",
  trackEnd: assetNames.scenes.alRab,
  trackEndBlender: "Desert_Scene_Floor.005",

  pathInset: 2,
  useAuthoredStart: true,
  endOffsetX: 0,
  positionOffset: { x: 0, y: 0, z: 0 },

  scrollStart: null as number | null,
  scrollEnd: null as number | null,
  scrollFallback: { scrollStart: 0.52, scrollEnd: 0.38 },
} as const;
