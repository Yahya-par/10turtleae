import { assetNames } from "./assetNames";

export const cloudAnimationSettings = {
  clouds: [
    {
      id: "cloud1",
      objectName: assetNames.clouds.one,
      carrierName: "CloudCarrier001",
      lapDuration: 240,
      phaseOffset: 0,
    },
    {
      id: "cloud2",
      objectName: assetNames.clouds.two,
      carrierName: "CloudCarrier002",
      lapDuration: 280,
      phaseOffset: 60,
    },
    {
      id: "cloud3",
      objectName: assetNames.clouds.three,
      carrierName: "CloudCarrier003",
      lapDuration: 320,
      phaseOffset: 120,
    },
  ],

  /** Extra travel past the first/last scene edges. */
  startMargin: 5,
  endMargin: 5,
} as const;
