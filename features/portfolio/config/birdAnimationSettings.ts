import { assetNames } from "./assetNames";

export const birdAnimationSettings = {
  /** Scene 1 bounds — continuity panel (continuefloor.001 in Modelv1). */
  openingFloor: assetNames.scenes.continuityFloor,

  /** Inset from scene 1 entrance / exit (world X). */
  pathInset: 1.8,

  /** Birds only patrol over this scene — not the opening dunes (east) or later scenes (west). */
  patrolZoneObject: assetNames.perfectBuildings.object,
  patrolZoneBlender: assetNames.perfectBuildings.blenderName,

  /** Simple black gull silhouette. */
  birdColor: "#6F4E37",

  /** Wing spread angles (radians) — left + / right -. */
  wingUpAngle: 0.42,
  wingDownAngle: 0.08,
  downstrokePortion: 0.35,

  birds: [
    {
      lapDuration: 34,
      phaseOffset: 0,
      heightOffset: 4.2,
      z: -0.9,
      scale: 0.95,
      bobAmplitude: 0.1,
      bobSpeed: 1.3,
      zDrift: 0.18,
      flapSpeed: 4.8,
    },
    {
      lapDuration: 42,
      phaseOffset: 9.5,
      heightOffset: 5.4,
      z: 0.35,
      scale: 0.82,
      bobAmplitude: 0.12,
      bobSpeed: 1.1,
      zDrift: 0.22,
      flapSpeed: 4.4,
    },
    {
      lapDuration: 38,
      phaseOffset: 18,
      heightOffset: 3.7,
      z: -0.15,
      scale: 1.05,
      bobAmplitude: 0.09,
      bobSpeed: 1.45,
      zDrift: 0.15,
      flapSpeed: 5.1,
    },
    {
      lapDuration: 36,
      phaseOffset: 26,
      heightOffset: 4.8,
      z: 0.55,
      scale: 0.88,
      bobAmplitude: 0.11,
      bobSpeed: 1.25,
      zDrift: 0.2,
      flapSpeed: 4.6,
    },
    {
      lapDuration: 44,
      phaseOffset: 33,
      heightOffset: 3.9,
      z: -0.55,
      scale: 0.92,
      bobAmplitude: 0.1,
      bobSpeed: 1.35,
      zDrift: 0.17,
      flapSpeed: 4.9,
    },
  ],

  /** Two birds flying in formation with a shared banner between them. */
  bannerCarriers: {
    text: "Brands people line up for.",
    bannerColor: "#7B2D3B",
    bannerColorDark: "#5A2230",
    textColor: "#F7F0E8",
    trimColor: "#C9A66B",
    textFontFamily: 'Georgia, "Times New Roman", serif',
    bannerWidth: 3.4,
    bannerHeight: 0.62,
    birdSpacing: 3.9,
    bannerDrop: 0.42,
    birdScale: 0.9,
    /** Tighter inset — banner formation stays over Perfect_Buildings only. */
    patrolInset: 1.2,
    lapDuration: 52,
    phaseOffset: 14,
    heightOffset: 5.8,
    z: 0.2,
    bobAmplitude: 0.08,
    bobSpeed: 1.15,
    zDrift: 0.14,
    flapSpeed: 4.5,
  },
} as const;
