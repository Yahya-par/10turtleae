const IOS_INSTALL_DISMISSED_KEY = "iosInstallDismissed";

export function isIOSBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function needsIosInstallPrompt(): boolean {
  return isIOSBrowser() && !isStandaloneDisplayMode();
}

export function isIosInstallDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(IOS_INSTALL_DISMISSED_KEY) === "true";
}

export function dismissIosInstallPrompt(): void {
  sessionStorage.setItem(IOS_INSTALL_DISMISSED_KEY, "true");
}
