import { assetNames } from "./assetNames";

// safariCampWindSettings - settings for the safari camp wind effect
export const safariCampWindSettings = {
  objectName: assetNames.safari.camp,
  blenderObjectName: assetNames.safari.campBlender,
  objectMaterial: assetNames.safari.campMaterial,
  /** Displacement strength in local mesh units. */
  strength: 0.045,
  /** Wind oscillation speed. */
  speed: 1.05,
  /**
   * Local-space Z threshold for hanging fabric.
   * Lower Z vertices (tent base / flaps) receive more movement.
   */
  fabricZStart: 0.9,
  fabricZEnd: -1.35,
} as const;
