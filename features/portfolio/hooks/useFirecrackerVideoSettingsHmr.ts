import { useEffect, useState } from "react";

const SETTINGS_MODULE = "@features/portfolio/config/firecrackerVideoSettings";

export function useFirecrackerVideoSettingsHmr() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.hot) return;

    import.meta.hot.accept(SETTINGS_MODULE, () => {
      setRevision((value) => value + 1);
    });
  }, []);

  return revision;
}
