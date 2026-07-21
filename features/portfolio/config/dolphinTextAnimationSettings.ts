import { assetNames } from "./assetNames";

/**
 * Dolphin breach for `dolphintext001`.
 *
 * Keeps the authored facing (so the mesh never goes edge-on as a white needle),
 * then leaps in an arc with a mild nose-up / nose-down pitch.
 */
export const dolphinTextAnimationSettings = {
  objectName: assetNames.text.dolphin,
  blenderObjectName: assetNames.text.dolphinBlender,

  /** How far below the authored pose the dolphin rests underwater. */
  submergeDepth: 0.55,

  /** Peak height above the waterline (authored Y − submergeDepth). */
  jumpHeight: 1.6,

  /**
   * Horizontal leap across the river (world units).
   * Must match the mesh nose direction — positive X = leap toward the Dubai side
   * (avoids the “swimming backwards” look).
   */
  jumpTravel: { x: 2.6, y: 0, z: 0 } as const,

  /** Seconds for exit → air → re-entry. */
  jumpDuration: 4.0,

  /** Pause submerged between leaps. */
  jumpRest: 1.0,

  /**
   * Nose tip through the leap (radians), around world Z.
   * Exit = nose up, entry = nose down. Flip sign if tip looks wrong.
   */
  pitchAmount: 0.55,
} as const;
