import { assetNames } from "./assetNames";
import type { CarBodyWheelSettings } from "./carBodyAnimationSettings";

export const carScrollSettings = {
  body: assetNames.cars.body,
  bodyBlender: assetNames.cars.bodyBlender,
  carrierName: "CarScrollCarrier001",

  scene2Floor: assetNames.scenes.floor1,
  scene2FloorBlender: assetNames.scenes.floor1Blender,

  road: assetNames.roads.junaroadjevu,
  roadBlender: assetNames.roads.junaroadjevuBlender,

  /** Seconds for one east→west lap while the turtle is not riding. */
  lapDuration: 7,

  pathInset: 1.2,
  startInset: 1.5,
  endInset: 1.5,
  roadOffset: { x: 0, y: 0.5, z: 0 },
  carrierOffset: { x: 0, y: 0, z: 0 },

  travelExponent: 1.45,
  /** Multiplier for how quickly the car covers its route while the turtle is riding. */
  travelSpeed: 1.4,
  followLerp: 0.1,

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
