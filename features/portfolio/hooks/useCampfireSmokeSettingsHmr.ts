import { useEffect, useState } from "react";

const SETTINGS_MODULE = "@features/portfolio/config/campfireSmokeSettings";

/**
 * Bumps a revision when `campfireSmokeSettings.ts` is saved so smoke remounts
 * and emitter offsets apply without a full page refresh during tuning.
 */
export function useCampfireSmokeSettingsHmr() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.accept(SETTINGS_MODULE, () => {
      setRevision((value) => value + 1);
    });
  }, []);

  return revision;
}
