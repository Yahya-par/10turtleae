import type { ComponentProps } from "react";
import SceneBannerRoll from "./SceneBannerRoll";
import { futureMuseumBannerSettings } from "@features/portfolio/config/futureMuseumBannerSettings";

export type FutureMuseumBannerRollProps = Omit<
  ComponentProps<typeof SceneBannerRoll>,
  "settings"
>;

export default function FutureMuseumBannerRoll(props: FutureMuseumBannerRollProps) {
  return <SceneBannerRoll {...props} settings={futureMuseumBannerSettings} />;
}
