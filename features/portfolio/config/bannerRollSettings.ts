import type { dubaiFrameBannerSettings } from "./dubaiFrameBannerSettings";
import type { futureMuseumBannerSettings } from "./futureMuseumBannerSettings";
import type { newAtlantisBannerSettings } from "./newAtlantisBannerSettings";

export type BannerRollSettings =
  | typeof dubaiFrameBannerSettings
  | typeof futureMuseumBannerSettings
  | typeof newAtlantisBannerSettings;
