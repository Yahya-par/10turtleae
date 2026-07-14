import { useEffect, useState } from "react";

const SETTINGS_MODULE = "@features/portfolio/config/firecrackerAnimationSettings";

/**
 * Bumps a revision when `firecrackerAnimationSettings.ts` is saved so the
 * firecracker display remounts without a full page refresh during tuning.
 */
export function useFirecrackerAnimationSettingsHmr() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.accept(SETTINGS_MODULE, () => {
      setRevision((value) => value + 1);
    });
  }, []);

  return revision;
}
