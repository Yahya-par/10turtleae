import { assetNames } from "./assetNames";

export const metroTrainSettings = {
  train: assetNames.metro.train,
  stationLeft: assetNames.metro.stationLeft,
  stationRight: assetNames.metro.stationRight,

  legDuration: 5,
  pauseAtStation: 0.6,
  startInset: 2.5,
  endInset: 2.5,
} as const;
