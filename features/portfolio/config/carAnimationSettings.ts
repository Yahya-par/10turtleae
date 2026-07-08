import { assetNames } from "./assetNames";

export const carAnimationSettings = {
  cars: [
    {
      id: "car1",
      objectName: assetNames.cars.sedan,
      objectBlender: "Car1.001",
      carrierName: "CarCarrier001",
      lapDuration: 6,
      phaseOffset: 0,
    },
    {
      id: "rr",
      objectName: assetNames.cars.rangeRover,
      objectBlender: "RR.001",
      carrierName: "CarCarrier002",
      lapDuration: 8,
      phaseOffset: 2.5,
    },
  ],

  /** Dubai Frame landmark (~X -22) */
  sceneStart: assetNames.scenes.dubaiFrameLandmark,
  sceneStartBlender: "proper_dubaiframe.001",
  /** Coastal road mesh — cars stay within this bounds */
  road: assetNames.roads.juneRoad,
  roadBlender: assetNames.roads.juneRoadBlender,

  /** Inset from Dubai Frame entrance edge (high X, toward scene 1). */
  startInset: 1.5,

  /** Inset from road end at Al Arab (min X of Road.004). */
  endInset: 1.5,
} as const;
