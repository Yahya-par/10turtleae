import type { ComponentProps } from "react";
import SceneBannerRoll from "./SceneBannerRoll";
import { newAtlantisBannerSettings } from "@features/portfolio/config/newAtlantisBannerSettings";

export type NewAtlantisBannerRollProps = Omit<
  ComponentProps<typeof SceneBannerRoll>,
  "settings"
>;

export default function NewAtlantisBannerRoll(props: NewAtlantisBannerRollProps) {
  return <SceneBannerRoll {...props} settings={newAtlantisBannerSettings} />;
}
