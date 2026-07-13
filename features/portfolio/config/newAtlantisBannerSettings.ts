import { assetNames } from "./assetNames";
import { atlantisYachtScrollSettings } from "./yachtScrollSettings";

/**
 * Rolling banner on `newatlantis001` (Atlantis hotel).
 *
 * Edit this file, save, and hot-reload to position the banner.
 *
 * ANCHOR UVW (0–1) on hotel bounds:
 *   u = left → right, v = bottom → top, w = depth toward camera.
 *
 * `positionOffset` — world-space nudge after anchorTopUVW (x, y, z):
 *   x negative = left,  x positive = right
 *   y negative = down,   y positive = up
 *   z negative = toward camera, z positive = away from camera
 *
 * `bannerWidth` / `bannerHeight` — banner size in world units.
 *   Omit `bannerWidth` to derive width from `widthFromFrame` × hotel width.
 *   Omit `bannerHeight` to derive height from anchor top → bottom anchors.
 */
export const newAtlantisBannerSettings = {
  actor: "yacht" as const,
  frameAsset: assetNames.scenes.newAtlantis,
  frameAssetBlender: assetNames.scenes.newAtlantisBlender,
  scenePanel: assetNames.scenes.atlantis,
  scenePanelBlender: assetNames.scenes.atlantisBlender,

  yachtCarrierName: atlantisYachtScrollSettings.carrierName,

  /** Match scroll anywhere on the Atlantis floor panel, not only its center. */
  useScenePanelScrollRange: true,
  /** Yacht sails on shinywater — X rarely matches the hotel mesh center. */
  skipActorNearAnchor: true,

  /** Top attachment point on the hotel mesh. */
  anchorTopUVW: [0.5, 0.88, 0.48] as const,
  /** Bottom deploy limit on the hotel mesh. */
  bottomAnchorUVW: [0.5, 0.32, 0.48] as const,
  gapAboveBottomAnchor: 0.1,

  /** Fine world-space position tweak (x, y, z) after anchorTopUVW. */
  positionOffset: {
    x: 0,
    y: -2.90,
    z: -0.06,
  },

  /** Banner width in world units. Set to null to use widthFromFrame instead. */
  bannerWidth: 3.2 as number | null,
  /** Fallback width = hotel mesh width × this fraction when bannerWidth is null. */
  widthFromFrame: 0.34,

  /** Banner height in world units. */
  bannerHeight: 2.4,

  gapAboveFrameText: 0.08,
  rollRadiusFromOpening: 0.035,

  /** Yacht track progress while in front of Atlantis (full shinywater corridor). */
  yachtTravelProgressMin: 0.25,
  yachtTravelProgressMax: 1,

  scrollProgressPadding: 0.1,
  frameCenterXPadding: 9,

  unrollDuration: 4.4,
  renderOrder: 4,
  foregroundActorRenderOrder: 40,
  carrierName: "NewAtlantisBannerRoll001",
  contentImageUrl: null as string | null,

  placeholder: {
    headline: "ATLANTIS",
    subline: "Palm Jumeirah experience",
    background: "#0d4f7c",
    accent: "#7ed4ff",
    text: "#e8f6ff",
    back: "#083858",
    headlineFontSize: 56,
    sublineFontSize: 55,
    captionFontSize: 55,
  },
} as const;
