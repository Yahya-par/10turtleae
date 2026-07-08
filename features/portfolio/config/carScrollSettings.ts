import { assetNames } from "./assetNames";
import type { CarBodyWheelSettings } from "./carBodyAnimationSettings";

export const carScrollSettings = {
  body: assetNames.cars.body,
  bodyBlender: assetNames.cars.bodyBlender,
  carrierName: "CarScrollCarrier001",

  scene2Floor: assetNames.scenes.continuityFloor,
  scene2FloorBlender: assetNames.scenes.continuityFloorBlender,

  /** Scene 3 panel — car rest position (east entrance / Dubai Frame). */
  scene3Floor: assetNames.scenes.dubaiFrame,
  scene3FloorBlender: "Desert_Scene_Floor.002",
  scene3Landmark: assetNames.scenes.dubaiFrameLandmark,
  scene3LandmarkBlender: "proper_dubaiframe.001",

  road: assetNames.roads.juneRoad,
  roadBlender: assetNames.roads.juneRoadBlender,

  pathInset: 1.2,
  /** Tiny inset so wheels stay on the junaroadjevu mesh at start/end. */
  startInset: 0,
  endInset: 0,
  roadOffset: { x: 0, y: 0.5, z: 0 },
  carrierOffset: { x: 0, y: 0, z: 0 },

  /** 1 = linear scroll mapping along the full car route. */
  travelExponent: 1,
  /** Multiplier on scroll→travel mapping (higher = car reaches west end sooner). */
  travelSpeed: 1.4,
  /** Idle loop duration (seconds) for the back-and-forth drive when no turtle is aboard. */
  lapDuration: 7,
  /** Kept for reverse-return smoothing; forward scroll uses direct mapping. */
  followLerp: 0.75,

  /** Start boat→car transfer when centers are within this X distance. */
  transferStartDistanceX: 3.8,
  transferEndDistanceX: 2.4,
  transferArcHeight: 0.85,
  transferDuration: 1.85,
  reverseTransferScrollHold: 0.15,

  /** Fraction of car height to pull seat down from the roof (higher = lower on roof). */
  turtleCarRoofInset: 0.3,
  turtleCarSeatOffsetX: 0,
  /** Negative values lower the turtle on the roof. */
  turtleCarSeatOffsetY: -0.03,
  turtleCarSeatOffsetZ: 0.05,

  wheels: {
    front: {
      pivotName: "CarScrollFrontWheelPivot001",
      runtimeName: assetNames.cars.frontWheel,
      blenderName: assetNames.cars.frontWheelBlender,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      spinAxis: { x: 0, y: 1, z: 0 },
      spinSpeed: 14,
      spinDirection: 1,
    },
    back: {
      pivotName: "CarScrollBackWheelPivot001",
      runtimeName: assetNames.cars.backWheel,
      blenderName: assetNames.cars.backWheelBlender,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      spinAxis: { x: 0, y: 1, z: 0 },
      spinSpeed: 14,
      spinDirection: 1,
    },
  } satisfies Record<"front" | "back", CarBodyWheelSettings>,
} as const;
