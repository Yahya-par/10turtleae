import { assetNames } from "./assetNames";

/**
 * Curved headline painted onto `arrowfountain001` along the glowing arrow.
 *
 * Curve points are normalized image UVs (origin top-left, y down) sampled from
 * the arrow shaft. Edit + save to retune with HMR.
 */
export const arrowFountainTextSettings = {
  objectName: assetNames.arrowFountain.object,
  blenderObjectName: assetNames.arrowFountain.blenderName,

  text: "Websites that turn visitors into Customers",

  /**
   * Cubic Bezier through the arrow shaft (before the arrowhead).
   * Each point: [u, v] in 0–1 image space.
   */
  curve: {
    start: [0.355, 0.498] as const,
    control1: [0.47, 0.447] as const,
    control2: [0.58, 0.34] as const,
    end: [0.665, 0.2] as const,
  },

  /**
   * Lift text above the arrow along the curve normal
   * (fraction of image height — positive = toward top of image).
   */
  normalOffset: 0.016,

  /** Fraction of sampled arc length used for glyphs (leaves padding at ends). */
  pathFill: 0.92,

  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 700,
  /** Starting size as a fraction of image height; auto-shrinks to fit the arc. */
  fontSizeFromHeight: 1.038,
  minFontSize: 22,
  letterSpacing: 1.2,

  fillColor: "#1a1510",
  strokeColor: "rgba(255, 245, 220, 0.85)",
  strokeWidth: 3.5,
  shadowColor: "rgba(0, 0, 0, 0.35)",
  shadowBlur: 6,
} as const;
