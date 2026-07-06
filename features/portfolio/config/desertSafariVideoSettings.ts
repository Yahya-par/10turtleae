import { assetNames } from "./assetNames";

export const desertSafariVideoSettings = {
  /** Desert safari camp billboard (Blender: lahbbabimageasset.001, ~X -128). */
  objectName: assetNames.safari.bellyDancerBillboard,
  blenderObjectName: assetNames.safari.bellyDancerBillboardBlender,
  videoUrl: "/Videos/BELLYDANCERVIDEO.mp4",
  overlayName: "DesertSafariBellyDancerVideoOverlay",
  /** Discard near-black pixels so the MP4 background stays transparent. */
  alphaCutoff: 0.08,
  /** Smaller than the source billboard mesh (~5.1 x 3.4 world units). */
  scale: 0.5,
  /**
   * Manual position tweak in world units (edit these numbers and hot-reload).
   * X = left/right along the scroll path (negative = further into the scene)
   * Y = up/down
   * Z = toward/away from the camera path
   */
  positionOffset: [0, -5.7, 0] as const,
} as const;
