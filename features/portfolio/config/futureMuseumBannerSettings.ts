import { assetNames } from "./assetNames";
import { carScrollSettings } from "./carScrollSettings";

/**
 * Future Museum rolling banner on `futuremuseum001`.
 *
 * ANCHOR UVW (0–1) on museum bounds:
 *   u = left → right, v = bottom → top, w = depth toward camera.
 *
 * `bannerHeight` = manual height in world units (overrides top/bottom anchor math).
 *
 * Placeholder font sizes (`headlineFontSize`, etc.) are in px at a 1024px-tall
 * canvas — change them without changing `bannerHeight` or `widthFromFrame`.
 */
export const futureMuseumBannerSettings = {
  frameAsset: assetNames.metro.futureMuseum,
  frameAssetBlender: "futuremuseum.001",
  scenePanel: assetNames.scenes.museumFloor,
  scenePanelBlender: "Desert_Scene_Floor.003",

  road: assetNames.roads.juneRoad,
  roadBlender: assetNames.roads.juneRoadBlender,
  roadOffset: carScrollSettings.roadOffset,
  carCarrierName: carScrollSettings.carrierName,

  /** Top of the museum torus opening. */
  anchorTopUVW: [0.40, 0.62, 0.42] as const,
  /** Bottom deploy limit on the museum mesh. */
  bottomAnchorUVW: [0.5, 0.28, 0.42] as const,
  gapAboveBottomAnchor: 0.12,

  worldNudge: [0, -0.12, -0.08] as const,
  widthFromFrame: 0.30,

  /** Manual banner height in world units. Overrides anchorTop/bottom distance when set. */
  bannerHeight: 1.8,

  gapAboveFrameText: 0.08,

  rollRadiusFromOpening: 0.035,
  /** Car route segment in front of the Future Museum / metro station. */
  carTravelProgressMin: 0.38,
  carTravelProgressMax: 0.68,
  scrollProgressPadding: 0.06,
  frameCenterXPadding: 5.5,

  unrollDuration: 5.4,
  renderOrder: 4,
  foregroundActorRenderOrder: 40,
  carrierName: "FutureMuseumBannerRoll001",
  contentImageUrl: null as string | null,

  placeholder: {
    headline: "AUTOMATION",
    subline: "Workflow & AI agents",
    background: "#FFFFFF",
    back: "#F0F0F0",
    accent: "#C9A66B",
    text: "#000000",
    fontFamily: '"Segoe UI", Arial, sans-serif',
    textShadow: "rgba(0, 0, 0, 0.15)",
    /** Font sizes in px at 1024px canvas height — banner size unchanged. */
    headlineFontSize: 56,
    sublineFontSize: 56,
    captionFontSize: 56,
  },
} as const;
