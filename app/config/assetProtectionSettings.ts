export const assetProtectionSettings = {
  /** Master switch for inspect / right-click blocking. */
  enabled: true,

  /**
   * Also block while running `npm run dev` (localhost).
   * Set to `false` only when you need DevTools during development.
   */
  enabledInDevelopment: true,
} as const;
