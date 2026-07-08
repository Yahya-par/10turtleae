import { useEffect, useRef } from "react";
import * as THREE from "three";
import normalizeWheel from "normalize-wheel";
import {
  getScrollProgressBounds,
  type ScrollProgressBounds,
} from "@features/portfolio/components/camera/CameraPath";

const BASE_SCROLL_SPEED = 0.0048;
const LERP_FACTOR = 0.12;
/** 1: scroll up moves forward through the diorama (progress decreases toward deeper scenes) */
const SCROLL_DIRECTION = 1;

function clampScrollProgress(
  progress: number,
  bounds: ScrollProgressBounds,
) {
  return THREE.MathUtils.clamp(progress, bounds.min, bounds.max);
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
  const lastTouchY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
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

      if (isDragging.current) {
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
      isDragging.current = true;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      isDragging.current = true;
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging.current || lastTouchY.current === null) return;
      const deltaY = event.touches[0].clientY - lastTouchY.current;
      targetScrollProgress.current += SCROLL_DIRECTION
        * Math.sign(deltaY)
        * BASE_SCROLL_SPEED
        * 0.3;
      targetScrollProgress.current = clampScrollProgress(
        targetScrollProgress.current,
        scrollBounds.current,
      );
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      lastTouchY.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled]);

  return {
    scrollProgress,
    targetScrollProgress,
    scrollBounds,
    mousePositionOffset,
    mouseRotationOffset,
    lerpFactor: LERP_FACTOR,
  };
}
