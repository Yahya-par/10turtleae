import type { futureMuseumBannerSettings } from "./futureMuseumBannerSettings";
import type { newAtlantisBannerSettings } from "./newAtlantisBannerSettings";
import type { dubaiFrameBannerSettings } from "./dubaiFrameBannerSettings";

export type BannerRollSettings =
  | typeof futureMuseumBannerSettings
  | typeof newAtlantisBannerSettings
  | typeof dubaiFrameBannerSettings;
