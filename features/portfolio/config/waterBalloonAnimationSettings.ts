import { assetNames } from "./assetNames";

/**
 * Rising service balloons over `water001` (Burj Al Arab / jetski scene).
 *
 * u / v = spawn X / Z on the water mesh bounds (0–1).
 * `riseDuration` = seconds for one bottom → top cycle.
 */
export const waterBalloonAnimationSettings = {
  water: assetNames.jetski.water,
  waterBlender: assetNames.jetski.waterBlender,
  sceneFloor: assetNames.scenes.alRab,
  sceneFloorBlender: "Desert_Scene_Floor.005",

  carrierName: "WaterBalloonCarrier001",
  renderOrder: 6,

  /** Inset from water mesh edges for spawn X/Z. */
  waterInset: 1.4,
  /** World units below the water surface where balloons spawn. */
  spawnBelowSurface: 1.6,
  /** World units above the water surface where balloons disappear / reset. */
  riseAboveSurface: 5.5,

  scrollProgressPadding: 0.09,
  /** World size of each balloon billboard. */
  labelSize: 0.9,

  swayAmount: 0.22,
  swaySpeed: 0.55,

  balloons: [
    {
      text: "UI/UX",
      color: "#7ec8f0",
      colorDark: "#4a9fd4",
      textColor: "#0f2a3d",
      u: 0.32,
      v: 0.38,
      phase: 0,
      riseDuration: 14,
      scale: 1,
    },
    {
      text: "Branding",
      color: "#f0a8d8",
      colorDark: "#d078b8",
      textColor: "#3d1230",
      u: 0.54,
      v: 0.58,
      phase: 4.8,
      riseDuration: 16,
      scale: 1.06,
    },
    {
      text: "Web",
      color: "#90e8c0",
      colorDark: "#58c898",
      textColor: "#0f3328",
      u: 0.7,
      v: 0.44,
      phase: 9.2,
      riseDuration: 13,
      scale: 0.96,
    },
  ],
} as const;
