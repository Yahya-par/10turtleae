/**
 * Call once at module scope in any file that imports `endCamelScrollSettings`
 * so saving that config does not invalidate React components and remount
 * DesertModel (which wipes turtle mount refs).
 */
const SETTINGS_MODULE = "@features/portfolio/config/endCamelScrollSettings";

export function acceptEndCamelScrollSettingsUpdate() {
  if (!import.meta.hot) return;

  import.meta.hot.accept(SETTINGS_MODULE, () => {
    // Revision bumps are handled by useEndCamelScrollSettingsHmr in consumers.
  });
}
