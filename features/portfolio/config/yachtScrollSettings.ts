import { assetNames } from "./assetNames";

export type YachtScrollSettings = {
  label: string;
  yacht: string;
  yachtBlender: string;
  water: string;
  waterBlender: string;
  carrierName: string;
  sceneStart: string;
  sceneStartBlender: string;
  sceneEnd: string;
  sceneEndBlender: string;
  trackEnd: string;
  trackEndBlender: string;
  /** Optional second water mesh at the destination scene (e.g. marina after mosque river). */
  waterEnd?: string;
  waterEndBlender?: string;
  /**
   * stopBeforeNextScene — cap at panel edge (Atlantis).
   * throughNextScene — sail into the next panel (mosque → marina).
   */
  trackEndMode: "stopBeforeNextScene" | "throughNextScene";
  pathInset: number;
  useAuthoredStart: boolean;
  /** When true, start/end come purely from the water mesh east/west edges. */
  useWaterBounds?: boolean;
  startOffsetX: number;
  endOffsetX: number;
  positionOffset: { x: number; y: number; z: number };
  scrollStart: number | null;
  scrollEnd: number | null;
  scrollFallback: { scrollStart: number; scrollEnd: number };
  /** Extra nudge on route start (x/y/z). Only used when set — see mosqueYachtScrollSettings. */
  manualStartPosition?: { x: number; y: number; z: number };
  /** Extra nudge on route end (x/y/z). Only used when set — see mosqueYachtScrollSettings. */
  manualEndPosition?: { x: number; y: number; z: number };
  turtleSeatOffsetX?: number;
  turtleSeatOffsetY?: number;
  turtleSeatOffsetZ?: number;
  turtleDeckHeightFactor?: number;
  transferArcHeight?: number;
  transferDuration?: number;
  reverseTransferScrollHold?: number;
};

/** Atlantis / Palm Jumeirah — yacht.001 on shinywater.001 */
export const atlantisYachtScrollSettings: YachtScrollSettings = {
  label: "Atlantis",
  yacht: assetNames.yacht.object,
  yachtBlender: assetNames.yacht.blenderName,
  water: assetNames.yacht.water,
  waterBlender: assetNames.yacht.waterBlender,
  carrierName: "YachtScrollCarrier001",
  sceneStart: assetNames.scenes.atlantis,
  sceneStartBlender: assetNames.scenes.atlantisBlender,
  sceneEnd: assetNames.scenes.atlantis,
  sceneEndBlender: assetNames.scenes.atlantisBlender,
  trackEnd: assetNames.scenes.atlantis,
  trackEndBlender: assetNames.scenes.atlantisBlender,
  trackEndMode: "stopBeforeNextScene",
  pathInset: 1.5,
  useAuthoredStart: false,
  useWaterBounds: true,
  startOffsetX: 0,
  endOffsetX: 0,
  positionOffset: { x: 0, y: 0, z: 0 },
  scrollStart: null,
  scrollEnd: null,
  scrollFallback: { scrollStart: 0.14, scrollEnd: 0 },

  turtleSeatOffsetX: 0.20,
  turtleSeatOffsetY: -0.05,
  turtleSeatOffsetZ: 0.55,
  turtleDeckHeightFactor: 0.62,
  transferArcHeight: 0.9,
  transferDuration: 1.85,
  reverseTransferScrollHold: 0.15,
};

/** Abu Dhabi Mosque → Dubai Marina → Blue Waters — yacht.002 */
export const mosqueYachtScrollSettings: YachtScrollSettings = {
  label: "Mosque → Marina → Blue Waters",
  yacht: assetNames.yacht.mosqueYacht,
  yachtBlender: assetNames.yacht.mosqueYachtBlender,
  water: assetNames.yacht.mosqueRiver,
  waterBlender: assetNames.yacht.mosqueRiverBlender,
  waterEnd: assetNames.yacht.mgrWater,
  waterEndBlender: assetNames.yacht.mgrWaterBlender,
  carrierName: "YachtScrollCarrier002",
  sceneStart: assetNames.scenes.abuDhabiMosque,
  sceneStartBlender: assetNames.scenes.abuDhabiMosqueBlender,
  sceneEnd: assetNames.scenes.floor11,
  sceneEndBlender: assetNames.scenes.floor11Blender,
  trackEnd: assetNames.scenes.floor11,
  trackEndBlender: assetNames.scenes.floor11Blender,
  trackEndMode: "throughNextScene",
  pathInset: 1.5,
  useAuthoredStart: true,
  startOffsetX: 0,
  endOffsetX: 0,
  positionOffset: { x: 0, y: 0, z: 0 },
  scrollStart: null,
  scrollEnd: null,
  scrollFallback: { scrollStart: 0.08, scrollEnd: 0 },

  /**
   * yacht.002 position — edit these only.
   * x: left (−) / right (+)   y: down (−) / up (+)   z: back (−) / forward (+)
   */
  manualStartPosition: { x: 0, y: 0.45, z: -1 },
  manualEndPosition: { x: 0, y: 0.45, z: -1 },
};

export const yachtScrollConfigs = [
  atlantisYachtScrollSettings,
  mosqueYachtScrollSettings,
] as const;

/** @deprecated Use atlantisYachtScrollSettings */
export const yachtScrollSettings = atlantisYachtScrollSettings;
