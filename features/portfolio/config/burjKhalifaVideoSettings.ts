import { assetNames } from "./assetNames";

/**
 * Burj Khalifa GIF overlay — Blender scene 6 / Dubai Mall panel.
 *
 * Target mesh: `anotherasset.003` — the Burj Khalifa tower cutout.
 * Do NOT use `dubaimall.001` — that mesh is the Dubai Mall building.
 *
 * Fine-tune in this file:
 * - `positionOffset` — move the cutout in scene units (X / Y / Z)
 * - `textureOffset.u` — shift right (+) / left (−) on the tower
 * - `textureScale.v` — stretch taller
 * - `mirrorX` — flip GIF if text reads backwards
 */
export const burjKhalifaVideoSettings = {
  sceneLabel: "scene 6 — Dubai Mall",
  objectName: assetNames.scenes.burjKhalifa,
  blenderObjectName: assetNames.scenes.burjKhalifaBlender,
  sceneFloor: assetNames.scenes.dubaiMallFloor,
  mediaUrl: "/Videos/BURJKHALIFA.gif",
  textureMaxEdge: 960,

  /** World X range for scene 6 Burj tower mesh. */
  sceneBounds: { minX: -82, maxX: -64 },

  mirrorX: false,

  /**
   * Move the Burj cutout in local scene units.
   * X = right (+) / left (−), Y = up (+) / down (−), Z = forward (+) / back (−).
   */
  positionOffset: { x: -0.7, y: -3, z: 0.5 },

  /** Shift GIF on the quad (UV 0–1). */
  textureOffset: { u: 0, v: 0 },

  /** UV stretch — increase `v` to stretch the GIF taller. */
  textureScale: { u: 1, v: 1 },
} as const;
