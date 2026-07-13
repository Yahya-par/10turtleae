import { assetNames } from "./assetNames";

export const metroTrainSettings = {
  train: assetNames.metro.train,
  stationLeft: assetNames.metro.stationLeft,
  stationRight: assetNames.metro.stationRight,
  bridge: assetNames.metro.bridge,

  legDuration: 5,
  pauseAtStation: 0.6,
  startInset: 1.5,
  endInset: 1.5,
  /** Extra inset when falling back to bridge bounds only */
  bridgeInset: 3.5,

  /** Billboard on Metro001 — moves with MetroTrainCarrier. */
  banner: {
    text: "Automation",
    bannerColor: "#FFFFFF",
    bannerColorDark: "#F0F0F0",
    textColor: "#000000",
    trimColor: "#C9A66B",
    textFontFamily: '"Segoe UI", Arial, sans-serif',
    textShadow: "rgba(0, 0, 0, 0.15)",
    width: 2.4,
    height: 0.35,
    /** Along train length (local X). */
    offsetX: 0,
    /** Gap above the train roof (local Y). */
    offsetY: -0.18,
    /** Depth relative to train center (local Z). Negative = back toward track. */
    offsetZ: 0.03,
  },
} as const;
