import { assetNames } from "./assetNames";

export const yachtScrollSettings = {
  yacht: assetNames.yacht.object,
  yachtBlender: assetNames.yacht.blenderName,
  water: assetNames.yacht.water,
  waterBlender: assetNames.yacht.waterBlender,
  carrierName: "YachtScrollCarrier001",

  /** Atlantis scene panel — yacht animates only while camera is here. */
  sceneStart: assetNames.scenes.atlantis,
  sceneStartBlender: assetNames.scenes.atlantisBlender,
  /** Same panel — scroll window ends when camera leaves Atlantis (not safari). */
  sceneEnd: assetNames.scenes.atlantis,
  sceneEndBlender: assetNames.scenes.atlantisBlender,

  /**
   * Mesh that caps the destination (safari is at lower X — do not use floor8).
   * Stops at the Atlantis panel edge so the yacht stays on the water scene.
   */
  trackEnd: assetNames.scenes.atlantis,
  trackEndBlender: assetNames.scenes.atlantisBlender,

  /** Inset from water / panel edges along the travel axis. */
  pathInset: 1.5,

  /** Start from the yacht's authored GLB position instead of the water edge. */
  useAuthoredStart: true,

  /** Extra nudge on start X (positive = further right / toward Dubai). */
  startOffsetX: 0,
  /**
   * Extra nudge on end X from the track-end marker edge.
   * Positive = stop further right (safer). Negative = toward safari/desert.
   */
  endOffsetX: 0,

  /** Nudge applied every frame on top of the track position. */
  positionOffset: { x: 0, y: 0.3, z: 0 },

  /**
   * Manual scroll window (0–1). Set both to control when the yacht moves.
   * scrollStart: progress when yacht is at start (higher = enters scene earlier).
   * scrollEnd: progress when yacht reaches end (lower = must scroll further to finish).
   * Example: { scrollStart: 0.12, scrollEnd: 0 } — full sail as you scroll to the left.
   */
  scrollStart: null as number | null,
  scrollEnd: null as number | null,
} as const;
