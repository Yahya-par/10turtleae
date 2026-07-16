const HAS_SEEN_JOURNEY_KEY = "hasSeenJourney";
const HAS_SEEN_JOURNEY_AT_KEY = "hasSeenJourneyAt";

export const JOURNEY_TTL_MS = 24 * 60 * 60 * 1000;

/** Marks the journey as seen (called when the final redirect transition fires). */
export function markJourneySeen(now = Date.now()) {
  localStorage.setItem(HAS_SEEN_JOURNEY_KEY, "true");
  localStorage.setItem(HAS_SEEN_JOURNEY_AT_KEY, String(now));
}

/** True while the 24h repeat-visit cooldown is still running. */
export function isJourneyCooldownActive(now = Date.now()) {
  const hasSeenJourney = localStorage.getItem(HAS_SEEN_JOURNEY_KEY) === "true";
  const lastSeenAt = Number(
    localStorage.getItem(HAS_SEEN_JOURNEY_AT_KEY) ?? "0",
  );
  return hasSeenJourney && lastSeenAt > 0 && now - lastSeenAt < JOURNEY_TTL_MS;
}
