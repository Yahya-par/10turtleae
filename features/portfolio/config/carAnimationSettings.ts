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

  /** Dubai Frame landmark (~X -22) — Modelv1 has no Desert_Scene_Floor.002 panel. */
  sceneStart: assetNames.scenes.dubaiFrameLandmark,
  sceneStartBlender: "proper_dubaiframe.001",
  /** Burj Al Arab landmark (~X -92) — Modelv1 has no Desert_Scene_Floor.005 panel. */
  sceneEnd: assetNames.scenes.alRabLandmark,
  sceneEndBlender: "burjalarab.001",
  /** Last road mesh on this route in Modelv1.glb. */
  roadEnd: assetNames.roads.stretched,
  roadEndBlender: assetNames.roads.stretchedBlender,

  /** Inset from Dubai Frame entrance edge (high X, toward scene 1). */
  startInset: 1.5,

  /** Inset from road end at Al Arab (min X of Road.004). */
  endInset: 1.5,
} as const;
