import { assetNames } from "./assetNames";

export type CarBodyWheelSettings = {
  pivotName: string;
  runtimeName: string;
  blenderName: string;
  positionOffset: { x: number; y: number; z: number };
  rotationOffset: { x: number; y: number; z: number };
  spinAxis: { x: number; y: number; z: number };
  spinSpeed: number;
  spinDirection: 1 | -1;
};

export const carBodyAnimationSettings = {
  body: assetNames.cars.body,
  bodyBlender: assetNames.cars.bodyBlender,
  carrierName: "CarBodyCarrier001",

  /** Seconds for one full lap along the road (same idea as CarAnimation). */
  lapDuration: 12,
  phaseOffset: 0,

  /** Applied every frame on top of the road track position. */
  carrierOffset: { x: 0, y: 0, z: 0 },

  /** Route along RoadStreched.001 in Modelv1.glb. */
  track: {
    road: assetNames.roads.stretched,
    roadBlender: assetNames.roads.stretchedBlender,
    startInset: 1.5,
    endInset: 1.5,
    /** Nudge along the road — applied live every frame (safe to tune in dev). */
    roadOffset: { x: 0, y: 0.5, z: 0 },
  },

  wheels: {
    front: {
      pivotName: "CarFrontWheelPivot001",
      runtimeName: assetNames.cars.frontWheel,
      blenderName: assetNames.cars.frontWheelBlender,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      spinAxis: { x: 0, y: 1, z: 0 },
      spinSpeed: 14,
      spinDirection: 1,
    },
    back: {
      pivotName: "CarBackWheelPivot001",
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
