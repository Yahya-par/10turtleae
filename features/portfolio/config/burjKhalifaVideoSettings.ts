import { assetNames } from "./assetNames";

export const burjKhalifaVideoSettings = {
  /** Burj Khalifa billboard in the Dubai Mall scene (Blender scene 5). */
  objectName: assetNames.scenes.burjKhalifa,
  blenderObjectName: assetNames.scenes.burjKhalifaBlender,
  sceneFloor: assetNames.scenes.dubaiMallFloor,
  videoUrl: "/Videos/10%20Turtlevideo.mp4",
  overlayName: "BurjKhalifaVideoOverlay",
  /** Discard near-black pixels so the MP4 background stays transparent. */
  alphaCutoff: 0.08,
} as const;
