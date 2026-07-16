export type PostJourneyTransition =
  | "horizontal"
  | "vertical"
  | "fade"
  | "wipe"
  | "iris"
  | "blurFade";

/**
 * Blank-page reveal after the 3D model journey ends (final scene).
 * Always auto-triggered: once the scroll reaches the journey end, the
 * reveal plays by itself (time-based) and reverses when scrolling back.
 *
 * Set `transition` to choose the reveal style:
 *   - "horizontal" — slides in from the right
 *   - "vertical"   — slides in from the bottom
 *   - "fade"       — crossfades over the final scene
 *   - "wipe"       — clip-path wipe left → right
 *   - "iris"       — circular expand from the center
 *   - "blurFade"   — 3D scene blurs + dims while the blank page fades in
 */
export const postJourneyScrollSettings = {
  enabled: true,
  /** Blank-page reveal style after the model ends. */
  transition: "iris" as PostJourneyTransition,
  /** Reveal duration in ms. */
  autoDurationMs: 1100,
  /** Blank page fill. */
  background: "#f7f4ef",
  /**
   * URL to navigate to the instant the reveal finishes (no timer — the
   * redirect is driven by the transition reaching 100%). Null disables it.
   */
  redirectUrl: "https://turtle.10turtle.com/" as string | null,
  /**
   * Screenshot of the destination site shown inside the transition (e.g.
   * the iris circle) so the reveal opens onto the website itself. The site
   * blocks live iframe embeds (X-Frame-Options: DENY), so a snapshot is used.
   */
  redirectPreviewSrc: "/post-journey/redirect-preview.png" as string | null,
  /** blurFade only — max scene blur in px at full reveal. */
  blurMaxPx: 14,
  /** blurFade only — scene brightness at full reveal (1 = unchanged). */
  blurDimTo: 0.85,
} as const;
