  import { loaderSettings } from "../../config/loaderSettings";
import PortfolioLoader from "./PortfolioLoader";
import MinimalLoader from "./MinimalLoader";
import FreakyLoader from "./FreakyLoader";
import SpyltLoader from "./SpyltLoader";
import AuroraLoader from "./AuroraLoader";
import DonLoader from "./DonLoader";

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

  if (activeLoader === "loader6") {
    return <DonLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  if (activeLoader === "loader5") {
    return <AuroraLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  if (activeLoader === "loader4") {
    return <SpyltLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  if (activeLoader === "loader3") {
    return <FreakyLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  if (activeLoader === "loader2") {
    return <MinimalLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
  }

  // Default to loader1 (original desert loader)
  return <PortfolioLoader isAssetsReady={isAssetsReady} onComplete={onComplete} />;
}
