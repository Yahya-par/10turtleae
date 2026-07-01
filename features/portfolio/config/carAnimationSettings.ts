import { assetNames } from "./assetNames";

export const carAnimationSettings = {
  cars: [
    {
      id: "car1",
      objectName: assetNames.cars.sedan,
      carrierName: "CarCarrier001",
      lapDuration: 10,
      phaseOffset: 0,
    },
    {
      id: "rr",
      objectName: assetNames.cars.rangeRover,
      carrierName: "CarCarrier002",
      lapDuration: 15,
      phaseOffset: 2.5,
    },
  ],

  /** Scene 3 — Dubai Frame (Desert_Scene_Floor.002, ~X -22). */
  sceneStart: assetNames.scenes.dubaiFrame,
  /** Scene 7 — Burj Al Arab (Desert_Scene_Floor.005). */
  sceneEnd: assetNames.scenes.alRab,
  /** Last road mesh — caps end X so cars stay on pavement. */
  roadEnd: assetNames.roads.alRabEnd,

  /** Inset from Dubai Frame entrance edge (high X, toward scene 1). */
  startInset: 1.5,

  /** Inset from road end at Al Arab (min X of Road.004). */
  endInset: 1.5,
} as const;
