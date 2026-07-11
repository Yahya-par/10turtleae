import { useEffect, useState } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

/** Screen-width breakpoints (px). Rotation is visual only, so innerWidth stays stable. */
export const MOBILE_MAX_WIDTH = 767;
export const TABLET_MAX_WIDTH = 1024;

/** Mobile or tablet (iPad) — not desktop. */
export function isHandheldDevice(): boolean {
  if (typeof window === "undefined") return false;

  const width = window.innerWidth;
  if (width <= TABLET_MAX_WIDTH) return true;

  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const isIPadOS =
    navigator.platform === "MacIntel" && maxTouchPoints > 1;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  // iPad Pro landscape and large touch tablets can exceed 1024px width.
  if (isIPadOS) return true;
  if (isCoarsePointer && maxTouchPoints > 0 && width <= 1366) return true;

  return false;
}

/** Reactive handheld check for layout / fullscreen gates. */
export function useIsHandheld(): boolean {
  const [isHandheld, setIsHandheld] = useState(isHandheldDevice);

  useEffect(() => {
    const update = () => setIsHandheld(isHandheldDevice());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isHandheld;
}

function readDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width <= MOBILE_MAX_WIDTH) return "mobile";
  if (width <= TABLET_MAX_WIDTH) return "tablet";
  return "desktop";
}

/** Detects mobile / tablet / desktop using the screen-width method. */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(readDeviceType);

  useEffect(() => {
    const update = () => setDeviceType(readDeviceType());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return deviceType;
}

function readIsPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

/** True while the device is physically held in portrait orientation. */
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState<boolean>(readIsPortrait);

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const update = (event: MediaQueryListEvent) => setIsPortrait(event.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isPortrait;
}
