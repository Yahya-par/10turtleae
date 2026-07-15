import { assetNames } from "./assetNames";

/**
 * Belly dancer GIF — screen overlay anchored to `safariland001`.
 * Edit this file and hot-reload to move / resize.
 *
 * ANCHOR (on safariland001 bounds, 0–1):
 *   u = left → right across the land panel
 *   v = bottom → top on the panel
 *   w = back → front depth
 *
 * screenOffset = pixel nudge after projection
 * screen.width = display width in px (height follows GIF portrait ratio)
 */
export const desertSafariVideoSettings = {
  // videoUrl: "/Videos/BELLYDANCERVIDEO.gif",
  overlayName: "DesertSafariBellyDancerVideoOverlay",

  anchorAsset: assetNames.safari.land,
  anchorAssetBlender: assetNames.safari.landBlender,

  /** Point on safariland001 used for screen placement. */
  anchorUVW: [0.3, 0.3, 1.7] as const,

  /** Pixel nudge after projecting the anchor (x = right, y = down). */
  screenOffset: { x: 0, y: 0 },

  /** Extra scroll-progress padding around safariland001 X span. */
  visibleProgressPadding: 0.03,

  /** Fallback if safariland bounds are unavailable (safari is low progress, not high). */
  visibleBetweenProgress: [0.02, 0.18] as const,

  screen: {
    /** Display width in px. */
    width: 72,
    /** Center the overlay on the projected anchor. */
    center: true,
  },
} as const;
