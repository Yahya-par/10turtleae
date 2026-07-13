import { assetNames } from "./assetNames";
import { carScrollSettings } from "./carScrollSettings";

/**
 * Dubai Frame rolling banner — edit this file, save, and hot-reload to position.
 *
 * ANCHOR on `proper_dubaiframe001` bounds (0–1):
 *   u = left → right across the frame mesh
 *   v = bottom → top (inner opening top ≈ 0.70–0.76, NOT 0.9+)
 *   w = back → front depth (lower w = toward the scroll camera)
 *
 * `worldNudge` = extra world-space offset after the anchor (x, y, z).
 *   y negative = move banner down
 *   z negative = pull toward camera
 *
 * Bottom edge stops `gapAboveFrameText` above the gold frametext plaque.
 */
export const dubaiFrameBannerSettings = {
  frameAsset: assetNames.scenes.dubaiFrameLandmark,
  frameAssetBlender: "proper_dubaiframe.001",
  frameTextAsset: assetNames.text.frame,
  frameTextAssetBlender: assetNames.text.frameBlender,
  scenePanel: assetNames.scenes.dubaiFrame,
  scenePanelBlender: "Desert_Scene_Floor.002",

  road: assetNames.roads.juneRoad,
  roadBlender: assetNames.roads.juneRoadBlender,
  roadOffset: carScrollSettings.roadOffset,
  carCarrierName: carScrollSettings.carrierName,

  /** Top attachment point — center of inner opening. */
  anchorTopUVW: [0.49, 0.9, -0.5] as const,

  /** Fine world-space nudge after anchorTopUVW (x, y, z). */
  worldNudge: [0, -0.28, -0.14] as const,

  /** Banner width as fraction of frame mesh width. */
  widthFromFrame: 0.4,

  /** Gap between banner bottom and the gold frametext plaque. */
  gapAboveFrameText: 0.08,

  rollRadiusFromOpening: 0.035,
  /** Car travel progress while still at the Dubai Frame dock (0 = parked). */
  carArrivalProgress: 0.28,
  scrollProgressPadding: 0.05,
  frameCenterXPadding: 2.8,

  unrollDuration: 3.4,
  /** Banner draw order — keep below foregroundActorRenderOrder. */
  renderOrder: 4,
  /** Car + turtle draw above the banner while it is visible. */
  foregroundActorRenderOrder: 40,
  carrierName: "DubaiFrameBannerRoll001",
  contentImageUrl: null as string | null,

  placeholder: {
    headline: "BANNER",
    subline: "Content coming soon",
    background: "#8f2d14",
    accent: "#f5c842",
    text: "#fff8eb",
    back: "#e8dcc8",
  },
};
