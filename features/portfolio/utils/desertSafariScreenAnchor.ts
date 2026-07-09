export type DesertSafariScreenAnchor = {
  left: number;
  top: number;
  ready: boolean;
  /** Raw scroll progress window derived from safariland001 bounds. */
  visibleMin: number;
  visibleMax: number;
  rangeReady: boolean;
};

export const desertSafariScreenAnchor: DesertSafariScreenAnchor = {
  left: 0,
  top: 0,
  ready: false,
  visibleMin: 0,
  visibleMax: 1,
  rangeReady: false,
};
