export const journeySettings = {
  /**
   * `dev`: Always allow watching journey flow (no 24h lock).
   * `prod`: Enforce hasSeenJourney 24h lock + repeat redirect flow.
   */
  mode: "prod" as "dev" | "prod",
} as const;

export const isJourneyDevMode = journeySettings.mode === "prod";
