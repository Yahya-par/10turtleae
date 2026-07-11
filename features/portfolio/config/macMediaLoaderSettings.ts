const ASSET_BASE = "/Images/BEST ASSETS";

export const macMediaLoaderServices = [
  "UIUX",
  "CANVA",
  "WEB DEV",
  "GRAPHICS & DESIGN",
  "MOBILE APP DEV",
  "VIDEO AND ANIMATION",
  "DIGITAL MARKETING",
] as const;

export const macMediaLoaderImages = [
  `${ASSET_BASE}/SATISFYING DUBAI FRAME.png`,
  `${ASSET_BASE}/BEST MUSEUM IN THE WORLD.png`,
  `${ASSET_BASE}/BUILDINGS 2.0.png`,
  `${ASSET_BASE}/BUILDINGS 4.png`,
  `${ASSET_BASE}/SHOPPING COMPLEX.png`,
  `${ASSET_BASE}/BEST ATLANTIS.png`,
  `${ASSET_BASE}/AL ARAB WO BG.png`,
  `${ASSET_BASE}/AIN DUBAI.png`,
] as const;

export const macMediaLoaderSettings = {
  /** Primary load phase length — progress eases up to ~88% over this time. */
  counterDuration: 6,
  /** Pause on each service while it sits in the highlight row. */
  serviceHoldSeconds: 0.85,
  /** Scroll duration between services. */
  serviceScrollSeconds: 0.55,
  /** Independent image rotation interval (seconds). */
  imageCycleSeconds: 1.35,
  /** Crosshair line follow smoothing (0 = instant, 1 = no movement). */
  crosshairLerp: 0.18,
} as const;
