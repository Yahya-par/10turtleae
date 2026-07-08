import { useEffect, useState } from "react";

const SETTINGS_MODULE = "@features/portfolio/config/endCamelScrollSettings";

/**
 * Bumps a revision when `endCamelScrollSettings.ts` is saved so R3F rigs
 * rebuild without a full page refresh during tuning.
 */
export function useEndCamelScrollSettingsHmr() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.accept(SETTINGS_MODULE, () => {
      setRevision((value) => value + 1);
    });
  }, []);

  return revision;
}
