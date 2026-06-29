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
} as const;
