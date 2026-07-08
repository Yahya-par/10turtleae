/**
 * Free-placed belly dancer GIF — not bound to any Blender billboard.
 * Edit this file and hot-reload to move / resize.
 *
 * POSITION (pick ONE approach):
 * 1) Absolute world coords — set `useAbsolutePosition: true` and edit `position`
 * 2) Offset from SafariCamp — set `useAbsolutePosition: false` and edit `campOffset`
 *
 *   X = left (−) / right (+) along the scroll path
 *   Y = down (−) / up (+)
 *   Z = back (−) / toward camera (+)
 */
export const desertSafariVideoSettings = {
  videoUrl: "/Videos/BELLYDANCERVIDEO.gif",
  overlayName: "DesertSafariBellyDancerVideoOverlay",

  /** true = use `position` below. false = SafariCamp center + `campOffset`. */
  useAbsolutePosition: true,

  /** Absolute world XYZ (used when useAbsolutePosition is true). */
  position: [-126, 3.7, 8] as const,

  /** Offset from SafariCamp center (used when useAbsolutePosition is false). */
  campOffset: [-2.2, 1.4, 0.6] as const,

  /** Absolute fallback if camp mesh is missing. */
  fallbackPosition: [-124.5, 2.6, 8.4] as const,

  /**
   * Plane size in world units (manual scale).
   * Keep height ≈ width × (405/228) ≈ width × 1.78 for correct portrait ratio.
   * Smaller numbers = smaller on screen. Edit these and hot-reload.
   */
  width: 0.2,
  height: 0.3,

  /** Keep the plane facing the camera each frame. */
  faceCamera: true,
} as const;
