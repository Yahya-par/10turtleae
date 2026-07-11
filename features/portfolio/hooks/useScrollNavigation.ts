import { useEffect, useRef } from "react";
import * as THREE from "three";
import normalizeWheel from "normalize-wheel"; // normalize the wheel event to get the pixelY value
import {
  getScrollProgressBounds,
  type ScrollProgressBounds,
} from "@features/portfolio/components/camera/CameraPath";
import { isHandheldDevice } from "@features/portfolio/hooks/useDeviceType";

const BASE_SCROLL_SPEED = 0.0048;
const LERP_FACTOR = 0.12;
/** -1: scroll down moves forward through the diorama (progress decreases) */
const SCROLL_DIRECTION = -1;
/** Full-width horizontal swipe on mobile / tablet. */
const HANDHELD_HORIZONTAL_DRAG_SPEED = 0.24;

function clampScrollProgress(
  progress: number,
  bounds: ScrollProgressBounds,
) {
  return THREE.MathUtils.clamp(progress, bounds.min, bounds.max);
}

function applyHandheldTouchDelta(
  deltaX: number,
  deltaY: number,
  targetScrollProgress: { current: number },
  bounds: ScrollProgressBounds,
) {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    // Left swipe moves forward; right swipe moves back.
    targetScrollProgress.current += (deltaX / width) * HANDHELD_HORIZONTAL_DRAG_SPEED;
  } else {
    targetScrollProgress.current += SCROLL_DIRECTION
      * (deltaY / height)
      * HANDHELD_HORIZONTAL_DRAG_SPEED;
  }

  targetScrollProgress.current = clampScrollProgress(
    targetScrollProgress.current,
    bounds,
  );
}

export function useScrollNavigation(enabled: boolean) {
  /** Start at scene 1 (opening desert) until ScrollCamera refines from waypoints. */
  const scrollProgress = useRef(1);
  const targetScrollProgress = useRef(1);
  const scrollBounds = useRef<ScrollProgressBounds>(
    getScrollProgressBounds(null),
  );
  const mousePositionOffset = useRef(new THREE.Vector3());
  const mouseRotationOffset = useRef(new THREE.Euler());
  const isDragging = useRef(false);
  const lastTouchX = useRef<number | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const isScrollLocked = useRef(false);
  const isHandheldRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    const syncHandheld = () => {
      isHandheldRef.current = isHandheldDevice();
    };
    syncHandheld();

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (isScrollLocked.current) {
        targetScrollProgress.current = scrollProgress.current;
        return;
      }
      const normalized = normalizeWheel(event);
      targetScrollProgress.current += SCROLL_DIRECTION
        * Math.sign(normalized.pixelY)
        * BASE_SCROLL_SPEED
        * Math.min(Math.abs(normalized.pixelY) / 100, 1);
      targetScrollProgress.current = clampScrollProgress(
        targetScrollProgress.current,
        scrollBounds.current,
      );
    };

    //handleMouseMove - handle the mouse move event for the scroll navigation
    const handleMouseMove = (event: MouseEvent) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (event.clientY / window.innerHeight) * 2 - 1;

      mousePositionOffset.current.x = mouseX * 0.05;
      mousePositionOffset.current.y = mouseY * 0.05;
      mouseRotationOffset.current.x = mouseY * 0.05;
      mouseRotationOffset.current.y = mouseX * 0.05;

      if (isDragging.current && !isHandheldRef.current) {
        if (isScrollLocked.current) {
          targetScrollProgress.current = scrollProgress.current;
          return;
        }
        targetScrollProgress.current += SCROLL_DIRECTION
          * Math.sign(event.movementY)
          * BASE_SCROLL_SPEED
          * 0.2;
        targetScrollProgress.current = clampScrollProgress(
          targetScrollProgress.current,
          scrollBounds.current,
        );
      }
    };

    const handleMouseDown = () => {
      if (!isHandheldRef.current) {
        isDragging.current = true;
      }
    };

    const handleMouseUp = () => {
      if (!isHandheldRef.current) {
        isDragging.current = false;
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isHandheldRef.current || event.touches.length !== 1) return;

      isDragging.current = true;
      lastTouchX.current = event.touches[0].clientX;
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isHandheldRef.current || !isDragging.current || event.touches.length !== 1) {
        return;
      }
      if (lastTouchX.current === null || lastTouchY.current === null) return;

      if (isScrollLocked.current) {
        event.preventDefault();
        lastTouchX.current = event.touches[0].clientX;
        lastTouchY.current = event.touches[0].clientY;
        targetScrollProgress.current = scrollProgress.current;
        return;
      }

      const deltaX = event.touches[0].clientX - lastTouchX.current;
      const deltaY = event.touches[0].clientY - lastTouchY.current;

      if (deltaX !== 0 || deltaY !== 0) {
        event.preventDefault();
        applyHandheldTouchDelta(
          deltaX,
          deltaY,
          targetScrollProgress,
          scrollBounds.current,
        );
      }

      lastTouchX.current = event.touches[0].clientX;
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      lastTouchX.current = null;
      lastTouchY.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("resize", syncHandheld);
    window.addEventListener("orientationchange", syncHandheld);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("resize", syncHandheld);
      window.removeEventListener("orientationchange", syncHandheld);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let frameId = 0;
    const keepScrollFrozen = () => {
      if (isScrollLocked.current) {
        targetScrollProgress.current = scrollProgress.current;
      }
      frameId = window.requestAnimationFrame(keepScrollFrozen);
    };

    frameId = window.requestAnimationFrame(keepScrollFrozen);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled]);

  return {
    scrollProgress,
    targetScrollProgress,
    scrollBounds,
    mousePositionOffset,
    mouseRotationOffset,
    isScrollLocked,
    lerpFactor: LERP_FACTOR,
  };
}
