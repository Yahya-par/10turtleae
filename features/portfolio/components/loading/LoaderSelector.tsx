import { loaderSettings } from "../../config/loaderSettings";
import PortfolioLoader from "./PortfolioLoader";
import MinimalLoader from "./MinimalLoader";

type LoaderSelectorProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

/**
 * LoaderSelector - Wrapper component that renders the active loader
 * based on loaderSettings configuration
 */
export default function LoaderSelector({
  isAssetsReady,
  onComplete,
}: LoaderSelectorProps) {
  const { activeLoader } = loaderSettings;

  if (activeLoader === "loader2") {
    return <MinimalLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  // Default to loader1 (original desert loader)
  return <PortfolioLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
}
