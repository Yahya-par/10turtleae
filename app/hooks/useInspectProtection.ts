"use client";

import { useEffect } from "react";
import { assetProtectionSettings } from "@/app/config/assetProtectionSettings";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function shouldBlockShortcut(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) return false;

  const key = event.key.toLowerCase();
  const code = event.code;
  const { ctrlKey, metaKey, shiftKey, altKey } = event;

  if (key === "f12" || code === "F12" || event.keyCode === 123) return true;

  const mod = ctrlKey || metaKey;

  if (mod && shiftKey) {
    if (
      key === "i" ||
      key === "j" ||
      key === "c" ||
      key === "k" ||
      code === "KeyI" ||
      code === "KeyJ" ||
      code === "KeyC" ||
      code === "KeyK"
    ) {
      return true;
    }
  }

  if (altKey && metaKey) {
    if (
      key === "i" ||
      key === "j" ||
      key === "c" ||
      key === "u" ||
      code === "KeyI" ||
      code === "KeyJ" ||
      code === "KeyC" ||
      code === "KeyU"
    ) {
      return true;
    }
  }

  if (mod && key === "u") return true;

  return false;
}

function blockContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function blockShortcuts(event: KeyboardEvent) {
  if (!shouldBlockShortcut(event)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function blockDrag(event: DragEvent) {
  event.preventDefault();
}

const capture = { capture: true };

export function useInspectProtection(
  enabled = assetProtectionSettings.enabled,
) {
  useEffect(() => {
    const activeInDev =
      process.env.NODE_ENV !== "development" ||
      assetProtectionSettings.enabledInDevelopment;

    if (!enabled || !activeInDev) return;

    window.addEventListener("contextmenu", blockContextMenu, capture);
    document.addEventListener("contextmenu", blockContextMenu, capture);
    window.addEventListener("keydown", blockShortcuts, capture);
    document.addEventListener("keydown", blockShortcuts, capture);
    window.addEventListener("keyup", blockShortcuts, capture);
    window.addEventListener("dragstart", blockDrag, capture);

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, capture);
      document.removeEventListener("contextmenu", blockContextMenu, capture);
      window.removeEventListener("keydown", blockShortcuts, capture);
      document.removeEventListener("keydown", blockShortcuts, capture);
      window.removeEventListener("keyup", blockShortcuts, capture);
      window.removeEventListener("dragstart", blockDrag, capture);
    };
  }, [enabled]);
}

export function blockInspectContextMenu(
  event: React.MouseEvent | React.SyntheticEvent,
) {
  event.preventDefault();
  event.stopPropagation();
}
